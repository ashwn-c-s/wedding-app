# Wedding app implementation and release evidence

11 October 2026, India time. Implements the supplied master prompt; gallery remains excluded.

## Delivered implementation

- Restored compilation and typed/runtime-validated invite/default/venue contracts. Public landing uses the existing `/api/invite/defaultevents` `{venues}` response for missing, malformed, unknown, inaccessible or expired invitations. Server/network failures offer retry rather than exposing unrelated private data.
- Preserved the existing landing illustration, typography, colors and responsive design. Route changes cancel old requests and clear guest details immediately; fixed the static default-endpoint/token collision. Event dates use India time and calendar links preserve stored timestamps.
- Added guest event-scoped RSVP choices, required response validation, review before submission, duplicate-submit prevention, saved confirmation after refresh and venue details/maps links.
- Server validates token/payload, exact visible assigned event set and immutable saved responses. Inserts all RSVP rows together; existing guest/event uniqueness maps concurrent conflicts to HTTP 409. No browser service-role credential.
- Added Supabase email/password admin login/logout, session checks, full/restricted route and API authorization. Supabase client is loaded lazily. Bearer tokens attach only to the configured backend's admin endpoints; expired sessions redirect to login.
- Added guest search, per-record validated CSV imports, idempotent phone-based updates, invitation copy/WhatsApp sharing, filtered dashboard/person counts, formula-safe CSV export and existing-event editing. Editor preserves full timestamp precision/timezone on unrelated edits and displays edited times in Asia/Kolkata.
- Added API no-store/no-referrer response headers; frontend deep-link rewrites and privacy headers. Node's built-in watcher replaces vulnerable unused dev tooling. Updated dependencies within existing major-version ranges.

## Automated verification

- Backend TypeScript build and **22 tests** passed (mocked Supabase, real loopback HTTP).
- Frontend Angular compilation and **56 tests across 18 files** passed.
- Frontend production build passed: initial bundle approximately **369 KB**, within the existing 500 KB warning budget. No budget override.
- Dependency audits: **zero vulnerabilities** in both workspaces, including development dependencies.
- No lint command is configured. `git diff --check` reviewed before release.
- The restricted sandbox aborts `ng build` without diagnostics and blocks backend loopback listeners; approved execution outside the sandbox passes. Test failures are not hidden by this note.

## Browser and read-only integration evidence

- Public landing loads four current visible events from the existing Supabase project.
- Invalid-token and literal `defaultevents` invitation paths render generic details without a personalized greeting.
- Authorized owner-supplied invitation loads exactly its two permitted events.
- Its existing RSVP redirects to confirmation and survives browser refresh; no live response was submitted or changed.
- Its venue page shows two permitted venues and two directions links.
- Unauthenticated `/admin/guests` redirects to `/admin/login` with the intended return URL.
- Local mobile browser viewport **375×812** and desktop **1280×720** showed no horizontal overflow; landing visual layout inspected. No browser runtime errors observed in those flows.
- Production baseline frontend/backend HTTP 200 and production CORS for the actual frontend were verified before push. Post-push status is recorded below after verification.

These are browser checks in the available in-app Chromium surface, not evidence for physical WhatsApp, iOS Safari or Android devices. Submission/import/event-save mutations are covered by mocked integration tests, not production writes.

## Database and owner decisions

No schema, constraints, indexes, relationships, migrations or RLS policies were changed. Existing-column compatibility was checked read-only. Anonymous HEAD queries exposed zero rows on private tables. Full deployed RLS definitions and authenticated direct-table write permissions still need owner verification with `docs/policy-review.sql`.

Owner approved full admin enrollment of their selected account. Enrollment was attempted against the existing Supabase Auth directory; the account did not exist, so **no role/data change was made**. Owner must create/confirm the Auth account before enrollment can proceed. Identity-specific proposed SQL remains local and is not included in the Git release; `backend/scripts/enroll-admin.cjs` is a generic owner-operated tool.

Existing-schema limitations:

- Lock is inferred from saved RSVP rows, rather than a dedicated lock state. Historical partial responses stay locked. Strict serialization against simultaneous event visibility/assignment changes would require an approved database function/lock design.
- Creating a guest and inserting assignments are separate REST statements. Failure is explicitly reported without destructive rollback. Existing conflicting assignments are rejected; owner reconciliation is needed for a partially created guest. Fully atomic imports would require an approved transaction/RPC.
- Live timestamp data differs from the old date-only schema document. Event time labels for some records disagree with their timestamps; no event content was silently changed.

## Git and deployment

Existing deployment branch: `main`. Existing Vercel projects: frontend root `frontend/wedding-frontend`, backend root `backend`; production frontend `https://wedding-app-ebfy.vercel.app`, API `https://wedding-app-rouge-seven.vercel.app`.

Unrelated pre-existing edits to plan.md, requirements.md and favicon, plus the local manual HTTP request file and earlier status snapshot, remain untouched/uncommitted. Related landing/service edits and required venue assets are preserved in the implementation commit. No force-push or production environment change is used.

Implementation commit: `0bf57a1cb8e75f909fd94b49820d466160f1c91c`, pushed to `origin/main`. GitHub commit statuses reported **success** for both Vercel projects:

- Frontend deployment: https://vercel.com/ashwin-cs-team/wedding-app-ebfy/2GKa4fjharJxCrrAyoq6ybSb7yaK
- API deployment: https://vercel.com/ashwin-cs-team/wedding-app/Auj8KBycuWoEJbD23LRKS9JEhqqm

Post-push live verification: public-events API HTTP 200 with four events, `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; unauthenticated admin session HTTP 401. Production browser checks confirmed generic/malformed/default-token fallback, owner-approved guest RSVP redirect/confirmation refresh, permitted venues, and unauthorized admin redirect. No new browser errors appeared during the release smoke tests. Mobile **375×812** and desktop **1440×900** showed no horizontal overflow in the inspected production flows.

Release verdict: **Ready with known limitations for guest use**. Admin UI/API are deployed and automated tests pass, but live admin use remains blocked until the owner creates/confirms the approved Auth account and enrollment succeeds. No live RSVP submission, CSV import or event mutation was performed. Physical WhatsApp/mobile and cross-browser checks remain manual; authenticated direct-table RLS/write policies still require owner review. See backend/SECURITY_AND_RELEASE.md for transaction limits and security evidence.

## Admin creation and guest editing update — 11 October 2026

Added full-admin-only POST guest/event creation and guest detail/event-assignment editing. Guest editor retains the original invitation token, displays event names, validates duplicates/unknown events, and locks assignment changes when an RSVP already exists. Name, phone and party size remain editable; changing party size updates dashboard attendee totals. New events can be assigned individually from the Guests page or through the existing CSV import.

No schema/RLS changes. Guest details and assignment writes use separate existing-table operations; partial failures trigger explicit messages and reload for reconciliation. Do not edit assignments while a guest is actively submitting an RSVP. As with the existing importer, strict atomicity and serialization across concurrent admin/RSVP requests require a separately approved database transaction/RPC. No live guest/event mutation is used for validation.

Validation for this update: 30 backend tests and 63 frontend tests passed, including role restrictions, submitted-RSVP protection, selected assignment changes, duplicate phone/slug handling, partial-save recovery, new guest/event forms and India-time conversion. Frontend production build passed within the existing bundle budget.

## Owner feedback and RSVP/default-event correction — 11 October 2026

Owner confirmed production admin verification succeeded and event timings are correct. Claude history and gallery are explicitly not required. Public default-event listing is now restricted to visible wedding and reception records; assigned Mehndi/Wedding Eve remain available on personalized invitations.

The RSVP layout puts visible headings inside cards and stacks response choices on small screens with 44px tap targets. Synthetic read-only browser preview confirmed response review and no horizontal overflow at 320px, 375px and 1280px. No production RSVP was submitted.

Atomic guest/assignment saves and RSVP coordination are prepared in database/atomic-guest-saves.sql and backend integration. The functions are SECURITY INVOKER and executable only by service_role. Eight real local PostgreSQL function tests verify permission restrictions, complete create/edit rollback, invitation preservation, saved RSVP locks, stale event-set rejection and per-row import atomicity. They do not constitute a concurrent multi-connection stress test. Apply the reviewed SQL before deploying the atomic backend. Existing tables, RLS policies and records are not migrated or rewritten. Production function application is pending owner action/SQL-editor access.


## Atomic function installation — 11 October 2026

Owner confirmed the reviewed SQL was installed. Both save_guest_atomic and submit_rsvp_atomic returned the expected validation errors for safe, deliberately invalid service-role probes; no records were changed. Anonymous client attempts were denied for both functions. Backend integration commit 98b3071 was pushed to main. Public default events remain wedding and reception. Local validation was 39 backend tests (including eight actual PostgreSQL function tests), 64 frontend tests and successful frontend build.

## Editorial Photo Journal — 11 October 2026

Gallery scope was reintroduced by the owner, who chose option 1. Public and invitation-aware gallery routes now present a featured opening photograph and two editorial chapters with varied compositions. The fullscreen viewer supports native focus trapping, Escape dismissal, arrow navigation and horizontal swipes. Full admins have a photo upload page with album/caption controls, source validation, browser photo optimization and publication retry.

The existing public `wedding-photos` bucket and `photos` table are reused unchanged. Photos upload directly using Supabase signed upload tokens; the backend service-role key remains server-side. An administrator-bound, expiring HMAC intent authorizes publication of only the generated object path and metadata. Object MIME/size are checked before publication; retries use a stable photo primary key. No production sample photographs or test guest data were created. Unpublished objects from abandoned/failed uploads may require manual Storage cleanup.

The public gallery is empty until the owner adds photos through `/admin/gallery`. Automated tests verify authorization boundaries, metadata validation, publication retry, album layouts, viewer state/scroll restoration and source photo optimization. Read-only local browser checks use repository image fixtures solely for layout verification. A real authenticated Storage upload remains an owner check after deployment.

Gallery release validation: exact staged source passed 49 backend tests, 72 frontend tests and the production build (373.20 kB initial bundle). Gallery stylesheet has a non-blocking 202-byte warning above the 4 kB warning budget, below the 8 kB error limit. Browser fixture verification additionally passed at 320px with 44px chapter controls.
