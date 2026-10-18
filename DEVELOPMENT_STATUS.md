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
- Atomic saves: the owner installed the reviewed SQL; both transaction functions were verified with safe validation probes. The SQL saves guest details and event assignments in one transaction, including each CSV row, and coordinates with RSVP submissions using the same guest-row lock. Actual local PostgreSQL rollback, token preservation, assignment restrictions and function permission tests pass. Anonymous function execution was verified blocked. The atomic backend release is commit 98b3071.

## Verification and remaining items

- Previous atomic-save validation: 39 backend tests, 64 frontend tests and production frontend build passed. Gallery release validation is recorded below.
- Supabase direct-table/RLS policy review remains an owner task. Transaction guarantees cover the backend functions; direct writes outside them must be controlled by the existing access policies.
- Guest event visibility edits are still separate event administration operations; transaction coordination is specifically between guest assignment saves and RSVP submissions.
- Device retest of the mobile RSVP fix is recommended after deployment.
- Claude history/timeline retrieval remains excluded. The owner has reintroduced gallery scope and selected the Editorial Photo Journal design.

Unrelated local admin styling edits and existing favicon/planning changes are kept separate from this update.

## Editorial gallery — 11 October 2026

- Added public `/gallery` and invitation-aware gallery routes, navigation/footer links, featured image, two chapters, alternating photo compositions and captions.
- Fullscreen native dialog supports arrow keys, Escape, focus restoration and touch swipes. Gallery includes loading, empty, unavailable-image and retry states.
- Full admins can upload from `/admin/gallery`, choose a chapter and add a caption. Images are decoded and optimized to WebP at up to 2,400 pixels before direct signed uploads to the existing `wedding-photos` bucket. JPEG/PNG/WebP source files up to 15 MB are accepted.
- Publication verifies an expiring administrator-bound HMAC intent and the stored object's type/size. Primary-key reuse makes publish retries idempotent. No table, bucket or RLS changes.
- The bucket/gallery is public; the upload page explains that visibility. Only owner-selected photos should be published. No sample photos were added to Supabase.
- Local fixture browser checks covered desktop 1440px and mobile 375px, album filtering, viewer navigation, Escape/focus restoration and absence of horizontal overflow. Production upload still needs an owner-selected real photo to verify the complete Storage flow.

Gallery release validation: exact staged source passed 49 backend tests, 72 frontend tests and the production build (373.20 kB initial bundle). Gallery stylesheet has a non-blocking 202-byte warning above the 4 kB warning budget, below the 8 kB error limit. Browser fixture verification additionally passed at 320px with 44px chapter controls.

Gallery implementation commit 89d0644 deployed successfully to both Vercel projects. Live checks: `/api/gallery` returned an empty photo list, anonymous upload requests returned HTTP 401, `/gallery` rendered without browser errors or mobile horizontal overflow, and `/admin/gallery` redirected anonymous visitors to sign-in while preserving the destination. A final CSS correction gives the mobile empty-state heading explicit line spacing. No production photo upload was performed.

## Guest tags — implemented locally, migration pending (12 October 2026)

Approved guest tags are implemented: private multi-label selection/creation, shared rename controls, guest-list and full-admin dashboard filters, CSV add/preserve semantics and filtered exports. Guest details, event assignments and tag changes use a versioned transaction wrapper; legacy clients/CSV keep the original saving path and preserve tags. Draft input is retained on failures.

Validation: 65 backend tests (including eight actual PostgreSQL guest-tag migration/transaction tests), 82 frontend tests and production build pass. The working-tree build includes the owner's existing mobile invitation update. Synthetic local admin browser checks verified filtering, pending tag creation/save, global rename, modal behaviour, mobile tag editing and filtered attendee totals. No production guest/tag mutation or SQL migration was performed.

Owner review/application of `database/guest-tags.sql` is required before deploying tag-aware endpoints. Installation/release and rollback steps are in `docs/guest-tags-release.md`. The migration adds two private tables and a service-role-only wrapper; no existing invitation tokens or RSVP rows are rewritten. Invitation recovery is deferred for a better design review in `BACKLOG.md`.

## Guest tags production rollout — 18 October 2026

Owner review is complete and production deployment is authorized. Fresh validation passes: 65 backend tests, 82 frontend tests, successful production frontend build. Database probes show the tag tables and versioned RPC are not yet installed. Production application deployment is held until the approved SQL can be applied through a database-admin connection or authenticated dashboard. `backend/scripts/verify-guest-tags.cjs` verifies installation and anonymous access denial without modifying guest records.
