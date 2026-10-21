# Invitation overview v2

The new, authenticated `/admin/dashboard-v2` route is an isolated invitation-planning dashboard. `/admin/dashboard`, `/admin/rsvps`, and the default `/admin` redirect retain their existing behavior. No backend or database changes are required.

## What the numbers mean

- People invited is the sum of recorded party sizes, counting each guest ID once overall.
- Event headcounts count each party once in every assigned event. Event totals are not additive across celebrations.
- Search, event, and match-any tag filters affect cards, breakdowns, guest details, and planning CSV consistently. The full-list total remains visible when filters are active.
- Tag breakdowns show represented groups, including Untagged. Parties with several tags contribute to each group, so tag totals may overlap.
- Unassigned parties remain in overall totals and have a separate notice when all events are selected.
- RSVP responses never affect these figures. They are invitation-based planning headcounts, not confirmed attendance.

Full admins can inspect/filter tags. Restricted admins cannot see tag filters, labels, breakdowns, or CSV columns. Both roles use the existing admin authorization guard.

## Interface

V2 uses a scoped slate-and-blue light theme, compact navigation, prominent total headcounts, event-first cards, and expandable filters, tag breakdowns, and guest details. Existing admin pages and public invitation styling are untouched.

The planning CSV contains Guest, Party size, Event, and (for full admins) Tags. A party invited to several events has one row per event, so summing the whole CSV's party-size column is not a unique overall headcount. Unassigned parties are exported once; parties whose assigned event is unavailable are retained with an explicit label. The filename is `wedding-invitations-filtered.csv`, and spreadsheet formula escaping is retained.

## Verification

The implementation includes helper and component tests for count deduplication, RSVP independence, overlapping tags/events, filtering, empty and unassigned records, restricted privacy, exports, error/retry/refresh behavior, collapsed details, and route isolation. All 144 frontend tests and the production build pass. The build reports stylesheet-size warnings for the existing public Gallery and the isolated v2 stylesheet (7.56 KB; below the 8 KB error limit).

Browser visual checks on 320–430 px phones and desktop are still pending: the host Mac was locked during implementation. Before release, inspect overflow, long labels, large counts, expanded tag/guest sections, keyboard focus, and text enlargement. Publish through the existing `main` branch / Vercel workflow. The legacy dashboard remains the default route after publication.
