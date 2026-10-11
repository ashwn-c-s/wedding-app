# Backend security and release evidence — 11 October 2026

## Implemented application controls

- UUID invitation validation, explicit guest projection, and inner-joined permitted visible events. Public default response retains `{venues}` and contains event information only.
- RSVP requires one boolean response for every currently visible permitted event, rejecting duplicate/unknown IDs and malformed values. Existing responses lock future writes. All rows insert in one statement; the existing unique `(guest_id,event_id)` constraint rejects concurrent duplicate submissions.
- Admin bearer tokens are verified with Supabase Auth `getUser` and the user's role is loaded from `admin_users`. Only `full` and `restricted` are accepted. Restricted access includes session/dashboard; guest list/import and event list/update require full access.
- Dashboard/guest reads paginate beyond Supabase's default 1,000-row limit. Pending includes guests with incomplete assigned-event responses or no assignments; confirmed means all assigned events answered and at least one accepted; declined means all answered false. Attendance persons sum party size per accepted event.
- CSV imports validate each record, resolve existing event slugs and preserve existing invitation tokens. Existing event assignments must exactly match; import never removes them. Confirmed guest details cannot be overwritten. Results explicitly identify each created, updated or failed record.
- Event patches whitelist existing schema fields, validate dates and HTTPS map links; IDs/timestamps cannot be changed.

## Read-only database evidence

HEAD/count queries authenticated with the configured server credential verified existing columns (no private row data was retrieved): `guests` 15 rows; `events` 4; `guest_events` 7; `rsvps` 2; `admin_users` 0. Column compatibility includes `guests.token_used_at`. HEAD verifies column availability, not SQL data types. Public API inspection by the orchestrator subsequently confirmed `events.date` contains ISO timestamps, differing from the date-only schema documentation; the event editor accepts valid ISO timestamps without truncation and retains date-only compatibility.

Anonymous/public-client HEAD/count checks additionally returned zero visible rows for `guests`, `guest_events`, `rsvps`, `admin_users` and `events`; no anonymous read exposure was observed. This does not prove authenticated-user policy isolation or write restrictions.

No schema, policy or production data was changed. `database/createtable.sql` contains duplicate events creation, omits guests creation and enables RLS without policy definitions. `requirements.md` describes some policy examples, but is not proof of deployed policies. REST metadata cannot confirm live policy definitions or whether RLS is enabled. Owner inspection in Supabase is still required, especially anonymous table visibility and RSVP writes. The server uses its existing service-role credential and therefore application authorization must remain mandatory. Never place that credential in the frontend.

`admin_users` is empty: owner must enroll authorized existing Supabase Auth user IDs with role `full` or `restricted` in that existing table before anyone can administer the app. Login availability/email settings also require project-owner verification.

## Existing-schema limitations

- RSVP lock is inferred from any existing response; there is no explicit lock column. Existing partial submissions remain locked and require owner reconciliation. The unique constraint protects concurrent submissions against an unchanged permitted event set. Strict serialization with concurrent event-visibility/assignment changes requires an owner-approved transactional database function or explicit lock state.
- New guest creation and event assignments are separate statements. A failed assignment is explicitly reported as “Guest created but event assignment failed” without a destructive rollback. Existing conflicting assignments are rejected; an administrator must reconcile a partially created guest. Fully atomic multi-table imports require an approved transaction/RPC. Concurrent RSVP versus admin guest-detail updates also cannot be serialized with the existing REST-only API.
- Phone is stored as trimmed text per existing requirements; equivalent formatting variants are not normalized. Duplicates within one CSV are rejected and existing phone uniqueness remains authoritative.

## Runtime and validation

`npm run build`; `npm test` runs focused validation plus mocked HTTP integration tests (no production mutations). HTTP tests bind to localhost and require sandbox permission in this environment.

All API responses send `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, including unauthorized responses.

Unused gallery upload packages `multer`/`@types/multer` were removed. Compatible audit fixes remove runtime advisories. The vulnerable unused nodemon/chokidar/braces development chain was removed; `npm run dev` now uses Node 22+ built-in watch with the existing ts-node runtime. `npm audit` reports zero vulnerabilities across runtime and development dependencies. Existing nodemon.json is retained but unused.

`src/index.ts` exports the Express app for Vercel while retaining local execution via `npm start` or `npm run dev`. Vercel documents auto-detection of this entry point: https://vercel.com/docs/frameworks/backend/express . Configure existing backend project root as `backend`; no new deployment configuration is necessary for current Express detection. Production settings are not changed or verified here.

Required server environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; optional `FRONTEND_URL` is a comma-separated CORS allowlist. If unset, localhost and https://wedding-app-ebfy.vercel.app are allowed. A configured production value overrides that default and must include the actual frontend origin. Environment values were never printed.
