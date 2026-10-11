-- Read-only owner checks. No policy/schema/data modifications.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('events', 'guests', 'guest_events', 'rsvps', 'admin_users');

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('events', 'guests', 'guest_events', 'rsvps', 'admin_users')
order by tablename, policyname;

-- Confirm the existing RSVP uniqueness constraint used for concurrent locks.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.rsvps'::regclass;
