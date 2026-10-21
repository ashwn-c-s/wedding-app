# Invitation overview and admin theme

The authenticated `/admin/dashboard` route is the primary invitation-planning dashboard. `/admin/dashboard-v2` is now a compatibility redirect to the main dashboard. `/admin/rsvps` and the default `/admin` route also lead to the overview. No backend or database changes are required.

## What the numbers mean

- People invited is the sum of recorded party sizes, counting each guest ID once overall.
- Event headcounts count each party once in every assigned event. Event totals are not additive across celebrations.
- Search, event, and match-any tag filters affect cards, breakdowns, guest details, and planning CSV consistently. The full-list total remains visible when filters are active.
- Tag breakdowns show represented groups, including Untagged. Parties with several tags contribute to each group, so tag totals may overlap.
- Unassigned parties remain in overall totals and have a separate notice when all events are selected.
- RSVP responses never affect these figures. They are invitation-based planning headcounts, not confirmed attendance.

Full admins can inspect/filter tags. Restricted admins cannot see tag filters, labels, breakdowns, or CSV columns. Both roles use the existing admin authorization guard.

## Interface

The overview, Guests, Events, Photos, sign-in, loading/access status, tag dialogs, and location editor use the slate-and-blue light theme. Shared admin navigation links directly to the production Overview; there is no version switch. Guest CSV import is expandable to keep the guest list easier to reach on mobile. Public invitation styling is untouched.

The planning CSV contains Guest, Party size, Event, and (for full admins) Tags. A party invited to several events has one row per event, so summing the whole CSV's party-size column is not a unique overall headcount. Unassigned parties are exported once; parties whose assigned event is unavailable are retained with an explicit label. The filename is `wedding-invitations-filtered.csv`, and spreadsheet formula escaping is retained.

## Verification

The implementation includes helper and component tests for count deduplication, RSVP independence, overlapping tags/events, filtering, empty and unassigned records, restricted privacy, exports, error/retry/refresh behavior, collapsed details, and route isolation. All 156 frontend tests and the production build pass. The build reports stylesheet-size warnings for the existing public Gallery and the isolated v2 stylesheet (7.56 KB; below the 8 KB error limit).

Browser visual checks on 320–430 px phones and desktop are still pending: the host Mac was locked during implementation. Before release, inspect overflow, long labels, large counts, expanded tag/guest sections, keyboard focus, and text enlargement. Publish through the existing `main` branch / Vercel workflow. The modern invitation overview is the default admin dashboard after publication.

## Event entry register PDF

Open **Export event entry register** in Overview. Select an event, then download an A4 portrait register. The full invitation list for that event is the default, independent of dashboard search/tag filters and all RSVP responses. An explicit subset option applies current search and permitted tags; every PDF page is marked FILTERED REGISTER and repeats its scope.

The mandatory alphabetical guest list has one row per party, recorded invited headcount, and blank Admitted and Notes fields. Event/date/venue, party/people totals, generation/data timestamps in India time, table headings, and page numbers repeat. Rows stay together across page breaks. Tags appear inline alongside party names only for full admins, wrapping naturally for longer entries. Compact row spacing retains writable admission and notes fields. An optional unassigned appendix starts a separate page and is marked for review, not admission.

The PDF engine/fonts are loaded only when export is requested. Generation stays in the browser; no new server endpoint or database change is involved. Exports are blocked during dashboard refresh/error states. The PDF is a static paper register; writing admissions on it does not update the database.

Verification: 153 frontend tests pass. A compact four-page sample (three register pages plus one unassigned appendix) with 75 invitation parties was rendered and visually inspected; text extraction confirmed unique guest rows and repeating headings/page numbers. Filtered documents were checked for repeated scope labels. The owner confirmed guest-list PDF export works on their mobile device; the denser layout was checked by PDF rendering and text extraction.
