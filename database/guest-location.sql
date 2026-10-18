-- Requires atomic-guest-saves.sql and guest-tags.sql.
-- Adds an optional location column and a service-role-only transactional save RPC.
-- Existing guests start without a location. Existing tokens, RSVPs and policies remain intact.
begin;
create or replace function public.valid_guest_location(p jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
begin
  if p is null or p='null'::jsonb then return true; end if;
  if jsonb_typeof(p)<>'object' or p-'type'-'latitude'-'longitude'-'accuracy_m'-'maps_url'-'address'<>'{}'::jsonb then return false; end if;
  if p ? 'address' and p->'address'<>'null'::jsonb and (jsonb_typeof(p->'address')<>'string' or length(p->>'address')>500) then return false; end if;
  if p->>'type'='coordinates' then
    return coalesce(jsonb_typeof(p->'latitude')='number' and (p->>'latitude')::numeric between -90 and 90
      and jsonb_typeof(p->'longitude')='number' and (p->>'longitude')::numeric between -180 and 180
      and not(p ? 'maps_url')
      and (not(p ? 'accuracy_m') or p->'accuracy_m'='null'::jsonb or
        (jsonb_typeof(p->'accuracy_m')='number' and (p->>'accuracy_m')::numeric>=0)),false);
  elsif p->>'type'='maps' then
    return coalesce(not(p ? 'latitude' or p ? 'longitude' or p ? 'accuracy_m')
      and jsonb_typeof(p->'maps_url')='string' and length(p->>'maps_url')<=2048
      and p->>'maps_url' ~ '^https://(maps[.]app[.]goo[.]gl|maps[.]google[.]com)(/|$)|^https://(www[.])?google[.]com/maps(/|[?]|$)|^https://goo[.]gl/maps(/|[?]|$)',false);
  end if;
  return false;
exception when others then return false;
end;
$$;
revoke all on function public.valid_guest_location(jsonb) from public,anon,authenticated;
grant execute on function public.valid_guest_location(jsonb) to service_role;
alter table public.guests add column if not exists location jsonb
  constraint guests_location_valid check(public.valid_guest_location(location));
comment on column public.guests.location is 'Private guest home/current location; only full-admin API exposes it. Null means no location.';

create or replace function public.save_guest_atomic_v3(
  p_mode text,p_guest_id uuid,p_name text,p_phone text,p_party_size integer,p_event_ids uuid[],
  p_tag_ids uuid[] default null,p_new_tags text[] default null,p_tag_mode text default 'replace',p_location jsonb default null
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_result jsonb; v_id uuid;
begin
  if not public.valid_guest_location(p_location) then raise exception using errcode='P0001',message='INVALID_LOCATION'; end if;
  -- v2 obtains the guest lock and enforces RSVP restrictions. All changes share this transaction.
  v_result:=public.save_guest_atomic_v2(p_mode,p_guest_id,p_name,p_phone,p_party_size,p_event_ids,p_tag_ids,p_new_tags,p_tag_mode);
  v_id:=(v_result->'guest'->>'id')::uuid;
  update public.guests set location=nullif(p_location,'null'::jsonb) where id=v_id;
  return jsonb_set(v_result,'{guest,location}',coalesce(p_location,'null'::jsonb));
end;
$$;
revoke all on function public.save_guest_atomic_v3(text,uuid,text,text,integer,uuid[],uuid[],text[],text,jsonb) from public,anon,authenticated;
grant execute on function public.save_guest_atomic_v3(text,uuid,text,text,integer,uuid[],uuid[],text[],text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
