-- Review before applying in Supabase SQL Editor.
-- Requires database/atomic-guest-saves.sql already installed.
-- Adds two private tables and one service-role-only RPC; existing guests start untagged.
-- Existing invitation tokens, RSVP rows and the original save RPC are unchanged.
begin;

create table if not exists public.guest_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 40 and position('|' in name)=0
    and name=btrim(regexp_replace(name,'[[:space:]]+',' ','g'))),
  name_normalized text generated always as (lower(name)) stored unique,
  created_at timestamptz not null default now()
);
create table if not exists public.guest_tag_assignments (
  guest_id uuid not null references public.guests(id) on delete cascade,
  tag_id uuid not null references public.guest_tags(id),
  primary key(guest_id,tag_id)
);
create index if not exists guest_tag_assignments_tag_idx on public.guest_tag_assignments(tag_id);
alter table public.guest_tags enable row level security;
alter table public.guest_tag_assignments enable row level security;
revoke all on public.guest_tags,public.guest_tag_assignments from public,anon,authenticated;
grant select,insert,update,delete on public.guest_tags,public.guest_tag_assignments to service_role;

create or replace function public.save_guest_atomic_v2(
  p_mode text, p_guest_id uuid, p_name text, p_phone text,
  p_party_size integer, p_event_ids uuid[],
  p_tag_ids uuid[] default null, p_new_tags text[] default null, p_tag_mode text default 'replace'
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp
as $$
declare
  v_result jsonb;
  v_guest_id uuid;
  v_ids uuid[];
  v_id uuid;
  v_name text;
  v_tags jsonb;
begin
  if p_tag_mode is null or p_tag_mode not in ('replace','add')
     or (p_mode='import' and p_tag_mode<>'add') then
    raise exception using errcode='P0001',message='INVALID_TAGS';
  end if;
  -- The original RPC locks the guest and enforces existing RSVP/event restrictions.
  -- Any later tag error rolls back its guest/event writes as part of this transaction.
  v_result:=public.save_guest_atomic(p_mode,p_guest_id,p_name,p_phone,p_party_size,p_event_ids);
  v_guest_id:=(v_result->'guest'->>'id')::uuid;
  if p_tag_ids is not null or p_new_tags is not null then
    if coalesce(cardinality(p_tag_ids),0)>10 or coalesce(cardinality(p_new_tags),0)>10
       or array_position(p_tag_ids,null) is not null or array_position(p_new_tags,null) is not null then
      raise exception using errcode='P0001',message='INVALID_TAGS';
    end if;
    select coalesce(array_agg(distinct id),'{}'::uuid[]) into v_ids from unnest(coalesce(p_tag_ids,'{}'::uuid[])) id;
    if (select count(*) from public.guest_tags where id=any(v_ids))<>cardinality(v_ids) then
      raise exception using errcode='P0001',message='TAG_NOT_FOUND';
    end if;
    -- Stable lock ordering prevents opposite CSV label orders from deadlocking.
    for v_name in select label from (select distinct btrim(regexp_replace(name,'[[:space:]]+',' ','g')) label
      from unnest(coalesce(p_new_tags,'{}'::text[])) name) labels order by lower(label),label loop
      if length(v_name) not between 1 and 40 or position('|' in v_name)>0 then
        raise exception using errcode='P0001',message='INVALID_TAGS';
      end if;
      insert into public.guest_tags(name) values(v_name)
        on conflict(name_normalized) do update set name=guest_tags.name returning id into v_id;
      if not(v_id=any(v_ids)) then v_ids:=array_append(v_ids,v_id); end if;
    end loop;
    if p_tag_mode='add' then
      select coalesce(array_agg(distinct id),'{}'::uuid[]) into v_ids
        from (select unnest(v_ids) id union select tag_id from public.guest_tag_assignments where guest_id=v_guest_id) ids;
    end if;
    if cardinality(v_ids)>10 then raise exception using errcode='P0001',message='TOO_MANY_TAGS'; end if;
    insert into public.guest_tag_assignments(guest_id,tag_id)
      select v_guest_id,unnest(v_ids) on conflict do nothing;
    -- Removes labels from THIS guest only, never shared tags or invitation/RSVP data.
    if p_tag_mode='replace' then
      delete from public.guest_tag_assignments where guest_id=v_guest_id and not(tag_id=any(v_ids));
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name) order by t.name),'[]'::jsonb)
    into v_tags from public.guest_tag_assignments a join public.guest_tags t on t.id=a.tag_id where a.guest_id=v_guest_id;
  return jsonb_set(v_result,'{guest,tags}',v_tags);
end;
$$;
revoke all on function public.save_guest_atomic_v2(text,uuid,text,text,integer,uuid[],uuid[],text[],text) from public,anon,authenticated;
grant execute on function public.save_guest_atomic_v2(text,uuid,text,text,integer,uuid[],uuid[],text[],text) to service_role;
notify pgrst,'reload schema';
commit;
