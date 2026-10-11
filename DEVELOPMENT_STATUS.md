# Wedding app current status

Updated 11 October 2026 (Asia/Kolkata). This replaces the earlier repository baseline.

## Completed and deployed

- Personalized invitations, assigned-event visibility, RSVP review/submission, saved confirmation, venue directions and calendar links.
- Supabase admin sign-in and full/restricted access. Full admin enrollment for the owner's selected account was verified; the owner has now confirmed live production admin verification succeeds.
- Guest creation/editing, selected event assignments, CSV import, invitation sharing, RSVP dashboard/export and event creation/editing.
- About Us page with couple/family details.
- Wedding venue photo, correct reception photo, representative Wedding Eve and Mehndi SVG illustrations.
- Owner confirmed event timings are correct; no timing changes are needed.

## Current update

- Mobile RSVP: titles now sit inside cards; response labels stack on narrow screens with 44px tap targets. Local browser checks at 320px, 375px and 1280px found no horizontal overflow; response review was verified using a synthetic read-only fixture.
- Public default events: wedding and reception only. Mehndi and Wedding Eve remain available through personalized invitations when assigned.
- Atomic saves: application integration and owner-review SQL are prepared. The SQL saves guest details and event assignments in one transaction, including each CSV row, and coordinates with RSVP submissions using the same guest-row lock. Actual local PostgreSQL rollback, token preservation, assignment restrictions and function permission tests pass. Production activation requires installation of database/atomic-guest-saves.sql before the updated backend is deployed.

## Verification and remaining items

- Working-tree validation: 39 backend tests, 64 frontend tests and production frontend build pass.
- Supabase direct-table/RLS policy review remains an owner task. Transaction guarantees cover the backend functions; direct writes outside them must be controlled by the existing access policies.
- Guest event visibility edits are still separate event administration operations; transaction coordination is specifically between guest assignment saves and RSVP submissions.
- Device retest of the mobile RSVP fix is recommended after deployment.
- Claude history/timeline retrieval and gallery were explicitly removed from scope. No work is pending on either.

Unrelated local admin styling edits and existing favicon/planning changes are kept separate from this update.
