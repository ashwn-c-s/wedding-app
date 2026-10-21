# Event attendance invitation totals

21 October 2026

The RSVP dashboard Event attendance table now has three columns: Event, Invitations, People invited. Invitations counts unique guest parties assigned to each event. People invited sums their party sizes, irrespective of confirmed, declined or pending RSVP responses. Actual message sending is not tracked, as clarified by the owner.

The table follows the dashboard's existing search, event and permitted tag filters. A party assigned to multiple events counts once in each assigned event. Parties without event assignments are excluded from event totals. The overall RSVP cards, guest response table and CSV export retain their existing behavior.

Validation: all 119 frontend tests pass. Rendered tests verify the three columns, mixed RSVP outcomes, multiple-event assignments, zero-assignment events and the empty-state colspan. Filter tests verify search/event/tag combinations and that changing RSVP responses does not change invitation/people totals. The production build succeeds with the existing gallery stylesheet warning. No database or backend change is required. Manual mobile/browser verification was not performed.
