# Admin loading UX review

Reviewed 18 October 2026. Scope: login/session checks, Guests, RSVP dashboard, Events, Photos, save/import/upload feedback. This is a review; no application changes or production writes were made.

Evidence: current source plus six temporary Angular component probes, all reproduced as expected. The probes used synthetic guests and controlled offline/delayed responses; they were removed after the review. Browser inventory exposed no browsers and reported the Mac locked, so this is not a visual/device or screen-reader certification. Some local Event template/nav files have existing uncommitted formatting changes; those were preserved. Relevant loading behavior exists in the deployed implementation too.

## Findings, in priority order

### 1. P2 — Refresh can replace a newly saved guest with an older snapshot

Automated evidence. Start editing a guest, save, then refresh while save is pending. If save succeeds before the older refresh response arrives, load() replaces the guest list with the old name while the success notice still says Guest updated. This changes the displayed state, not the saved database record.

Source: Guests.load sets the full list unconditionally (guests.ts:61–75); save independently updates the list (guests.ts:148–155); Refresh has no saving/importing disable condition (guests.html:134). The component probe explicitly controlled response order and reproduced the stale display.

Fix: serialize incompatible reads/writes or invalidate pre-save refresh responses. Disable refresh during guest mutations/import and prevent saves against an active conflicting refresh. A request-generation guard should ensure older responses cannot replace newer state. Retest both completion orders and import refreshes.

### 2. P2 — Failed initial loads also display empty or zero states

Automated evidence across all four data pages. Each catch sets an error and finally turns loading off, without distinguishing failure from a successful empty result.

- Dashboard shows zero metrics and No invitations match these filters (dashboard.html:23–29,107–109; dashboard.ts:54–62).
- Guests shows No guests match your search and tag filter (guests.html:130,205; guests.ts:61–75).
- Events shows No events available and allows Add event, with no Retry/Refresh action (events.html:10–27; events.ts:36).
- Photos shows The journal is waiting for its first photograph (gallery.html:69–73; gallery.ts:36–44).

Fix: distinct initial-loading, success-empty, success-data and error states. Show an inline Retry action after failure. Render counts only after a successful response. If refreshing fails, retain the last successful data with an explicit stale-data message.

### 3. P2 — Refresh removes useful content and controls

Automated evidence for Guests; source-supported for Dashboard. Guests retains data in memory but removes the table/cards, view toggle and Refresh control while loading. Dashboard similarly hides its metrics and tables. This also removes the activated refresh button from the DOM. Scroll/focus effects on actual devices still need verification.

Fix: initial loading gets size-matched skeletons; subsequent refreshes keep content in place, show Refreshing… on a stable control and a small status indicator. Preserve filters, view selection, scroll and keyboard focus. Announce completion and failure without moving the user.

### 4. P2 — No visible progress during guarded admin navigation

Source-supported; timing/visual severity needs browser verification. Each protected route awaits authorize(), which reads the session and calls /api/admin/session. The app template only renders router-outlet and has no navigation/authentication progress state. Slow authorization can therefore leave the previous screen or an initially empty outlet without feedback. authorize() also maps network failures to false, so a valid session during an outage can be sent to login as though access were absent.

Sources: core/guards/admin.guard.ts, core/services/admin-auth.service.ts:33–41, app.html.

Fix: show Checking admin access… or a slim navigation indicator while the guard resolves. Distinguish expired/unauthorized sessions from a temporary verification outage; offer Retry for the latter. Preserve route authorization and do not render privileged content before authorization succeeds.

### 5. P2 — Guest save errors are delayed behind a second load

Source-supported. Guest save catches a server error but waits for load() before displaying that error or clearing saving (guests.ts:163–172). A slow refresh prolongs Saving… after the write has already failed, keeping the draft disabled. No application-level request deadline is configured in the admin service/interceptor.

Fix: show the save failure immediately and retain/re-enable the draft. Reconciliation reads should have a separate refreshing state. Treat a timed-out write as an unknown outcome: reconcile before inviting another create/import attempt, because a client timeout does not guarantee that the server cancelled the write.

### 6. P3 — Feedback placement and announcements are inconsistent

Source-supported. Guests puts Import guests, CSV inputs and filters before Loading guests… (guests.html:73–131), so the load status may be below the mobile viewport. Save/import errors and notices are at the page top while operations can occur far below. The actual viewport impact needs visual testing. Most pages have role=status for reads and role=alert for errors, but data regions lack aria-busy. Upload stages and saving labels mainly appear in disabled buttons; they are not dedicated live progress regions. Sign out stays labelled Sign out while pending.

Fix: put a compact page status beside the title/list toolbar, use operation-local feedback beside forms, add aria-busy to affected regions and a persistent polite status for stages. Reserve role=alert for actionable errors. Use Signing out… on the sign-out button. Do not display a fabricated percentage when actual progress is unavailable.

## What already works

- Login changes to Signing in… and prevents duplicate submission.
- Guest/event saves disable their forms; guest drafts and tags survive failed saves.
- CSV import reports successful and failed rows separately.
- Photo upload has real stage names (optimize, prepare, upload, publish); failed metadata publication can retry without uploading twice.
- Device-location capture shows Finding location…, has a 20-second timeout and manual alternatives.
- Read loading messages and error banners already use status/alert semantics in several places.

## Proposed design

Use one consistent state pattern per page:

1. First visit: visible page shell and heading, local loading label and skeletons shaped like the expected metrics/cards/table/photo tiles.
2. Refresh: keep current content and controls, show Refreshing…, prevent conflicting writes and reject stale responses.
3. Empty success: useful empty message and relevant action, e.g. Add guest; filtered-empty offers Clear filters.
4. Failure: concise error and Retry; retain and label previously loaded data if available.
5. Mutation: local Saving…/Importing…/Uploading… feedback, duplicate prevention and accessible status, with an immediate result/error beside the operation.
6. Slow network: a delayed Still loading… message and a clear recovery path; no fake progress percentage and no unguarded retry of an uncertain write.

Keep the existing cream/green visual language. Skeletons should be quiet and reserve layout space, with a static alternative when reduced motion is requested. This review does not assert WCAG conformance.

## Verification for implementation

Must retest: delayed and failed reads on all four pages; successful empty versus filtered-empty states; refresh preserving visible data and focus; save/refresh response races; failed save preserving a usable draft; photo publish retry; expired session versus network failure. Include both card/list guest modes and full/restricted roles.

Manual checks still needed: narrow mobile viewport with scroll/keyboard, slow-network admin navigation, screen-reader stage announcements, reduced-motion behavior and focus stability after refresh/retry. No deployment is part of this review.

## Implementation

The approved changes are implemented; see admin-loading-release.md for behavior, regression evidence and remaining manual verification. The review findings above describe the pre-change behavior.
