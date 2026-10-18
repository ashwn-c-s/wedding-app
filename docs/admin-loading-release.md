# Admin loading and recovery release

18 October 2026. Implements the findings in admin-loading-ux-review.md.

## Result

- Shared read status near the page heading on Guests, RSVP dashboard, Events and Photos. First reads use skeletons shaped for cards, table rows, metrics or photos; reduced-motion preference disables the pulse.
- Initial failure is separate from a successful empty result. Errors provide Retry and do not fabricate empty guest/event/photo lists or zero RSVP counts.
- Refresh keeps current content, filters, guest view mode and the refresh control in the DOM. A refresh failure explicitly labels the displayed data as previously loaded.
- Reads show a longer-than-usual message after six seconds and have a 20-second deadline. Request generations prevent older responses from replacing newer state.
- Guest/event saves and photo publication invalidate preceding reads. Refresh is blocked during incompatible mutations. CSV refresh runs after the write/report finishes.
- Guest save failures appear immediately beside the submit controls, retain the draft and re-enable editing. Uncertain outcomes require a successful read before another guest save/import or event save. No mutation is automatically retried or cancelled by a read deadline.
- Forms and upload actions have local status/error feedback; affected input/data regions expose aria-busy. Success notices remain visible with sticky placement. Empty filtered results offer Clear filters.
- Admin access verification has visible progress and a recoverable outage panel. A network/service failure cancels guarded navigation without signing out the existing session; Retry runs protected navigation again. Expired/unauthorized sessions still go to login and restricted roles remain restricted. Session and role checks have bounded waits.
- Sign-out changes to Signing out… while pending; login and tag rename have dedicated progress status text.

## Evidence

All 116 frontend tests pass. New coverage includes all four pages' initial error/Retry states, skeleton placement, keeping existing results and controls on refresh, stale guest/event responses, CSV read/write ordering, uncertain-save reconciliation, slow/deadline reads, and temporary access outage/retry, and hiding access feedback after returning to a public page. Existing suites cover guest locations, Cards/List, RSVP restrictions, login redirects, tags, and photo publication retry without duplicate uploads.

Production Angular build succeeds. The existing guest gallery stylesheet warning remains 219 bytes above its 4 KB warning budget and below the error budget. No new runtime dependency, backend change, database change, production guest modification or photo publication is part of this release.

Browser/device visuals and manual screen-reader checks remain unverified: Computer Use exposed no browser and reported the Mac locked during the review. Automated DOM behavior is verified; this is not a claim of visual/accessibility certification. Actual scroll/focus behavior, soft-keyboard positioning and announcements should receive a manual mobile check.

## Release and rollback

Push the tested frontend commit to main; verify Vercel and the served bundles, API health, and unauthenticated admin protection. Reverting the frontend commit restores the prior UI without a database rollback.
