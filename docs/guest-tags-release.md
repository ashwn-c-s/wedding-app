# Guest tags — installation and release

12 October 2026. Code is implemented locally; production rollout is pending the database migration.

## Install reviewed SQL first

Review `database/guest-tags.sql`, then run it in the project's Supabase SQL Editor after approving its contents. The existing `database/atomic-guest-saves.sql` functions must already be installed (they were verified in the previous release).

The migration adds:

- `guest_tags`: reusable labels with a unique case-insensitive normalized name.
- `guest_tag_assignments`: a private relationship between an invitation/party and its tags.
- `save_guest_atomic_v2`: a service-role-only wrapper around the existing atomic guest save, adding transactional tag creation/assignment.
- RLS and explicit revocation of direct anonymous/authenticated access to the two new tables. Full-admin API authorization remains required.

Existing guests start untagged. Existing tables, invitation tokens, event assignments and RSVP records are not rewritten by installation. The `delete from guest_tag_assignments` inside the function runs only when an organiser saves a guest's edited tag selection; it removes labels from that guest, not shared labels, guests, events or RSVP records.

The script is transactional and can be rerun. No production SQL was executed by the coding agent.

## Deploy after installation

1. Confirm the SQL completed successfully in Supabase.
2. Verify the new private tables/RPC exist and anonymous/authenticated table/function access is denied, using read-only or invalid-input probes.
3. Commit/push the guest-tags implementation through the existing frontend/backend release workflow, preserving unrelated local work.
4. Verify full-admin guest and dashboard loading, restricted-admin tag exclusion, and unauthenticated tag endpoint rejection.
5. The owner can then tag one real guest, refresh, filter the list/dashboard and export the selected group.

Do not deploy the new tag-aware list endpoints before installation: they query the new tables.

## Behaviour

- A guest/party can have up to 10 tags; labels contain 1–40 characters without `|`.
- Existing catalogue tags and pending new labels are selectable in the guest editor. New labels are created only when the guest saves successfully.
- Guest details, events and requested tag changes save in one transaction. Saved RSVP restrictions still apply to events; tags remain editable. Failed saves retain draft input.
- Full admins can rename shared labels, with an affected-guest count. A rename updates labels globally without changing invitation URLs, event assignments or responses.
- List and full-admin dashboard filters combine tags with existing search/event filters. Multi-tag guests are not double-counted. Restricted users receive no private tag data or tag export column.
- Existing CSV headers remain supported. Optional final `tags` column uses `|` to separate names; import adds labels, while omitted/blank cells preserve existing labels. Manual editing removes labels.

## Verification

Local PostgreSQL tests exercise the actual migration/RPC: normalization/reuse, creation/edit/import rollback, saved RSVP locks, invitation preservation, explicit tag removal, import union semantics, maximum combined tags, global rename and table/function privileges. API tests cover role boundaries, validation, RPC selection, catalogue counts, legacy CSV and extended CSV. Angular tests cover picker reuse/limits, list filters, draft recovery, rename handling, attendance counts and restricted exports. Browser checks use synthetic guests and an isolated local fixture only.

## Rollback

Revert the application release to the previous version if necessary. Leave the new tables/RPC and saved tags in place so rollback preserves organiser data; the old guest-save function still works and does not erase tags. Removing the new database objects is not part of the rollback and would require separate review.

## Deferred

Invitation recovery is recorded in `BACKLOG.md` for a better design review later. No recovery UI/state or contact flow changes are included here.

Final local results: 65 backend tests and 82 frontend tests pass. The frontend production build passes with a 360.07 kB initial working-tree bundle; the existing gallery stylesheet warning is unchanged. Native browser fixture checks passed for guest tag filtering, draft creation/save, shared rename dialog, 375px editing and tag-filtered attendance totals.

## Production rollout request — 18 October 2026

The owner completed review and authorized the production rollout. Fresh service-role probes show both new tables are still absent (PGRST205), and the new RPC is absent (PGRST202). No direct PostgreSQL or Supabase management credentials are configured in the project. Browser access is waiting on macOS Computer Use permissions. Applying the already-reviewed migration therefore requires an authenticated dashboard session or owner execution in Supabase SQL Editor; it is an access dependency, not another design approval.

Fresh validation on 18 October: 65 backend tests, 82 frontend tests and the production build pass. A reusable, non-mutating installation/privacy check is available at `backend/scripts/verify-guest-tags.cjs`. Run it after installation before pushing the application release.
