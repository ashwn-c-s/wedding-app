# Atomic guest saves rollout

The owner requested this improvement on 11 October 2026. The application update is prepared; do not deploy the new backend before its database functions exist.

1. Review `database/atomic-guest-saves.sql`. It adds `save_guest_atomic` and `submit_rsvp_atomic`, both SECURITY INVOKER, with execution restricted to service_role. It does not alter existing tables, policies or records.
2. The owner approves and runs that complete SQL file in the existing Supabase project's SQL Editor. Both functions and permission changes are created together in one transaction.
3. Run `node scripts/verify-atomic.cjs` from `backend`. These deliberately invalid requests verify that each function exists and rejects input before any mutation.
4. Deploy the tested backend update through main/Vercel. Guest creation/editing and each CSV row use one transaction; RSVP uses the same guest-row lock and revalidates current assigned visible events.
5. Verify the admin portal using the owner's normal records/workflow. Saved invitation links and RSVP rows are retained. Confirmed guests' event assignments stay locked; explicit detail edits remain allowed.

SQL tests run in the development-only PGlite PostgreSQL runtime via `npm test` in backend. Eight tests exercise the actual functions and rollback behavior. HTTP tests verify API error mapping and authorization. These tests do not simulate multiple PostgreSQL connections under load.

A CSV file remains a batch of independently atomic rows: one failed row does not undo earlier successful rows. A retry can safely reconcile completed rows by phone.

If reverting the release, restore the previous backend before removing these functions. Leaving unused service-role-only functions installed does not affect the prior backend. No guest data rollback is needed merely for installing them.

Direct database writes outside these functions and event visibility changes remain governed by the existing owner-managed access policies. Both functions coordinate guest assignment editing and RSVP submission through guest-row locks.
