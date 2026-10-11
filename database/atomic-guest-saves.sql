-- Owner review required before applying. Adds only service-role-only functions.
-- Existing tables, columns, policies, invitation tokens and RSVPs are preserved.
-- Both functions lock the same guest row, serializing assignment edits and RSVP.
begin;

create or replace function public.save_guest_atomic(
  p_mode text, p_guest_id uuid, p_name text, p_phone text,
  p_party_size integer, p_event_ids uuid[]
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_guest public.guests%rowtype;
  v_previous uuid[];
  v_requested uuid[];
  v_responses jsonb;
  v_created boolean := false;
begin
  if p_mode is null or p_mode not in ('create','edit','import')
     or p_name is null or length(btrim(p_name)) not between 1 and 200
     or p_phone is null or length(btrim(p_phone)) not between 1 and 50
     or p_party_size is null or p_party_size not between 1 and 1000 then
    raise exception using errcode='P0001', message='INVALID_GUEST';
  end if;
  if p_event_ids is null or cardinality(p_event_ids) not between 1 and 100
     or array_position(p_event_ids,null) is not null then
    raise exception using errcode='P0001', message='INVALID_EVENTS';
  end if;
  select array_agg(id order by id) into v_requested from (select distinct unnest(p_event_ids) as id) ids;
  if cardinality(v_requested) <> cardinality(p_event_ids)
     or (select count(*) from public.events where id = any(v_requested)) <> cardinality(v_requested) then
    raise exception using errcode='P0001', message='INVALID_EVENTS';
  end if;

  if p_mode='edit' then
    if p_guest_id is null then raise exception using errcode='P0001', message='GUEST_NOT_FOUND'; end if;
    select * into v_guest from public.guests where id=p_guest_id for update;
    if not found then raise exception using errcode='P0001', message='GUEST_NOT_FOUND'; end if;
  elsif p_mode='import' then
    select * into v_guest from public.guests where phone=btrim(p_phone) for update;
  else
    if p_guest_id is not null then raise exception using errcode='P0001', message='INVALID_GUEST'; end if;
  end if;

  if v_guest.id is null then
    insert into public.guests(name,phone,party_size)
      values(btrim(p_name),btrim(p_phone),p_party_size) returning * into v_guest;
    v_created := true;
  else
    select coalesce(array_agg(event_id order by event_id),'{}'::uuid[]) into v_previous
      from public.guest_events where guest_id=v_guest.id;
    if p_mode='import' and v_previous is distinct from v_requested then
      raise exception using errcode='P0001', message='IMPORT_ASSIGNMENTS_DIFFER';
    end if;
    if exists(select 1 from public.rsvps where guest_id=v_guest.id) then
      if v_previous is distinct from v_requested then
        raise exception using errcode='P0001', message='GUEST_RSVP_LOCKED';
      end if;
      if p_mode='import' and (v_guest.name is distinct from btrim(p_name) or v_guest.party_size is distinct from p_party_size) then
        raise exception using errcode='P0001', message='IMPORT_DETAILS_LOCKED';
      end if;
    end if;
    update public.guests set name=btrim(p_name),phone=btrim(p_phone),party_size=p_party_size
      where id=v_guest.id returning * into v_guest;
  end if;

  insert into public.guest_events(guest_id,event_id)
    select v_guest.id,unnest(v_requested) on conflict(guest_id,event_id) do nothing;
  delete from public.guest_events where guest_id=v_guest.id and not(event_id=any(v_requested));
  select coalesce(jsonb_agg(jsonb_build_object('event_id',event_id,'attending',attending)),'[]'::jsonb)
    into v_responses from public.rsvps where guest_id=v_guest.id;
  return jsonb_build_object('created',v_created,'guest',jsonb_build_object(
    'id',v_guest.id,'name',v_guest.name,'phone',v_guest.phone,'party_size',v_guest.party_size,
    'invite_token',v_guest.invite_token,'event_ids',to_jsonb(v_requested),'responses',v_responses));
end;
$$;

create or replace function public.submit_rsvp_atomic(p_guest_id uuid,p_invite_token uuid,p_responses jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_guest public.guests%rowtype;
  v_allowed uuid[];
  v_requested uuid[];
begin
  select * into v_guest from public.guests where id=p_guest_id and invite_token=p_invite_token for update;
  if not found then raise exception using errcode='P0001', message='GUEST_NOT_FOUND'; end if;
  if exists(select 1 from public.rsvps where guest_id=p_guest_id) then
    raise exception using errcode='P0001', message='RSVP_ALREADY_SUBMITTED';
  end if;
  if p_responses is null or jsonb_typeof(p_responses)<>'array' then
    raise exception using errcode='P0001', message='INVALID_RESPONSES';
  end if;
  if jsonb_array_length(p_responses) not between 1 and 100
     or exists(select 1 from jsonb_array_elements(p_responses) item
       where jsonb_typeof(item)<>'object' or jsonb_typeof(item->'attending') is distinct from 'boolean'
       or jsonb_typeof(item->'event_id') is distinct from 'string'
       or (item->>'event_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception using errcode='P0001', message='INVALID_RESPONSES';
  end if;
  select array_agg((item->>'event_id')::uuid order by (item->>'event_id')::uuid)
    into v_requested from jsonb_array_elements(p_responses) item;
  if (select count(distinct id) from unnest(v_requested) id)<>cardinality(v_requested) then
    raise exception using errcode='P0001', message='INVALID_RESPONSES';
  end if;
  select coalesce(array_agg(e.id order by e.id),'{}'::uuid[]) into v_allowed
    from public.guest_events ge join public.events e on e.id=ge.event_id
    where ge.guest_id=p_guest_id and e.is_visible=true;
  if v_allowed is distinct from v_requested then
    raise exception using errcode='P0001', message='EVENT_ASSIGNMENTS_CHANGED';
  end if;
  insert into public.rsvps(guest_id,event_id,attending)
    select p_guest_id,(item->>'event_id')::uuid,(item->>'attending')::boolean
    from jsonb_array_elements(p_responses) item;
  return jsonb_build_object('success',true);
end;
$$;

revoke all on function public.save_guest_atomic(text,uuid,text,text,integer,uuid[]) from public,anon,authenticated;
revoke all on function public.submit_rsvp_atomic(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_guest_atomic(text,uuid,text,text,integer,uuid[]) to service_role;
grant execute on function public.submit_rsvp_atomic(uuid,uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
