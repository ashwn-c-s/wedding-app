# Guest location implementation

## Behavior

Add/Edit guest has an optional location section accepting either an HTTPS Google Maps link or latitude/longitude, plus an optional address/landmark. Use my current location requests high-accuracy positioning only after a button press and displays the browser-reported accuracy. A Maps preview lets the admin inspect the pin. Saving occurs only with Save guest. Removal explicitly saves null.

Capture uses the admin's device, not the guest's device. High accuracy is a request, not a precision guarantee. Permission denial, unavailable services and timeouts keep manual entry available. Switching guest, clearing/editing location or closing the editor invalidates pending callbacks. Editing coordinates removes the accuracy estimate associated with the old measured point.

Full-admin guest cards show a Maps pin when a location is present. The five-column List table remains Name, Phone, Party size, Invited events, Edit. Public invitations, WhatsApp drafts, RSVP pages, dashboard/export responses and restricted admins receive no guest location.

## Database and compatibility

Apply database/guest-location.sql after the existing atomic guest save and tag migrations. It adds one nullable jsonb column with a validation constraint and a service-role-only v3 save RPC. The function wraps v2, preserving the existing guest-row locking, RSVP assignment restrictions and tag behavior. A location failure rolls back guest details, events and tags together. Existing rows start with SQL null; no existing guest details, invitation tokens or RSVP data are changed by applying the migration. UPDATE statements inside the function run only when that function is called to save a guest.

Requests omitting location and existing CSV imports keep using the existing RPCs, preserving stored location. Explicit null removes it. Supported map hosts are maps.app.goo.gl, maps.google.com, google.com/maps, www.google.com/maps and goo.gl/maps. No link resolution, paid maps integration, embedded map, reverse geocoding or new dependency is required.

## Validation on 18 October 2026

- 76 backend tests pass, including SQL create/update/removal, preservation of tokens/RSVPs, legacy imports/edits, rollback, direct-write constraints, service-role RPC restrictions and public invitation exclusion.
- 99 frontend tests pass, including permission denial, timeout/unavailable services, accuracy display, map preview, coordinate validation, clearing, stale callback handling, save payloads, blocking invalid/pending location and the private card pin.
- Frontend production build passes. The pre-existing gallery stylesheet budget warning remains.
- Migration was applied twice successfully to a local disposable PostgreSQL-compatible test database.
- Production no-data schema probe reports missing location column (42703). Nothing was written and no guest locations were read.
- Device/browser visual and real GPS testing remain unverified; Computer Use was unavailable in this session. Automated capture tests use mocked coordinates and permissions.

## Release sequence

1. Owner runs database/guest-location.sql in Supabase SQL Editor.
2. Run backend/scripts/verify-guest-location.cjs. It reads zero guest records and calls the new RPC with an invalid mode, which must fail before any write; it also confirms anonymous RPC execution is denied.
3. Push the tested commit to main and verify both Vercel deployments.
4. Smoke-check Add/Edit guest with real device permission and pin accuracy. No real guest location has been created during automated verification.

Rollback: revert the application commit. Leaving the additive column and RPC in place preserves any stored locations, and the previous save functions continue working.
