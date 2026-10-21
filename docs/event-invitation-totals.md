# Event attendance invitation totals

21 October 2026

The RSVP dashboard Event attendance table now has three columns: Event, Invitations, People invited. Invitations counts unique guest parties assigned to each event. People invited sums their party sizes, irrespective of confirmed, declined or pending RSVP responses. Actual message sending is not tracked, as clarified by the owner.

The table follows the dashboard's existing search, event and permitted tag filters. A party assigned to multiple events counts once in each assigned event. Parties without event assignments are excluded from event totals. The overall RSVP cards, guest response table and CSV export retain their existing behavior.

Validation: all 119 frontend tests pass. Rendered tests verify the three columns, mixed RSVP outcomes, multiple-event assignments, zero-assignment events and the empty-state colspan. Filter tests verify search/event/tag combinations and that changing RSVP responses does not change invitation/people totals. The production build succeeds with the existing gallery stylesheet warning. No database or backend change is required. Manual mobile/browser verification was not performed.

## Dashboard cards

The Confirmed, Declined and Pending cards are removed. Overall Invitations and People invited remain, followed by one people-invited card per event and per tag. Full admins also see an Untagged card; restricted admins receive no tag cards. Existing responsive metric styling is reused.

Event cards use the same assignment totals as the event table. Tag cards count each guest party once within each tag, even when that guest is invited to multiple events. A party with several tags contributes to each matching tag; these totals intentionally overlap. Overall and tag totals retain the existing inclusion of guests without event assignments when no event filter is active. Search, event and tag filters apply consistently. RSVP responses do not affect these invitation counts.

Validation: all 122 frontend tests pass and production build succeeds. Card tests cover event/tag/untagged/zero totals, overlapping tags, filter combinations, RSVP independence and restricted-role privacy. The original three-column event table remains. No backend or database changes are needed. These dashboard updates are committed locally and await explicit production publication approval.

## Per-event breakdown within each tag

Each tag card now displays Total people invited and one row for each event's invited people, including zero counts. The total counts each guest party once within the tag; event rows count that party for each event assignment. Event counts are therefore not added together to derive the unique total. An event filter narrows both the tag total and its event rows; search and tag filters remain active. Untagged gets the same breakdown. Restricted admins still see no tag cards.

Validation: 124 frontend tests pass and the production build succeeds. New rendered checks verify every tag's event rows, including empty-tag and Untagged zeros. Counting checks verify a party assigned to multiple events is unique in the total and verify combined event/tag/search filters. No schema or backend changes. Manual mobile visual verification remains pending.
