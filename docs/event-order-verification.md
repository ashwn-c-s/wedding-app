# “Your celebrations” chronological ordering — evidence

18 October 2026. Scope: ordering only; no stored event times or guest records changed.

## Cause confirmed from source

Before this update, `permittedEvents()` in `backend/src/routes/invite.ts` flattened joined guest-event assignments and returned them without an explicit sort. The personalised invitation page displayed that returned array directly (`landing.html`, event loop below “Your celebrations”). Thus personalised ordering was not guaranteed, even though a particular database response could already look correct.

The public default-events endpoint already orders by `date`. Production `date` values are complete timestamps, not date-only strings, so that query already includes time in its ordering.

## Fix

Sort permitted events by the numeric instant `Date.parse(event.date)`, with event ID as a deterministic tie-breaker when two events start together. This uses date, time and UTC offset together; it does not alphabetically sort the display label. The shared permitted-events function also keeps personalised venue and RSVP lists consistent.

## Production schedule read before the change

Only event schedule fields were read; no guest names, contact details or RSVP records were included.

| Event | Stored timestamp (UTC) | India local date/time |
| --- | --- | --- |
| Mehndi | 2026-11-14T04:30:00+00:00 | 14 November 2026, 10:00 am IST |
| Wedding's Eve | 2026-11-14T11:30:00+00:00 | 14 November 2026, 5:00 pm IST |
| Wedding Ceremony | 2026-11-15T05:00:00+00:00 | 15 November 2026, 10:30 am IST |
| Wedding Reception | 2026-11-15T12:00:00+00:00 | 15 November 2026, 5:30 pm IST |

Each guest sees only their assigned, visible events from this sequence.

**Schedule inconsistency:** Mehndi's display label currently says “Evening”, while its stored timestamp is 10:00 am IST. This change preserves the configured schedule and sorts by its stored timestamp. Correcting that mismatch is a separate organiser decision.

## Regression evidence

Two new HTTP route tests in `backend/test/routes.test.cjs` cover:

1. Assignment input deliberately shuffled as reception → eve → ceremony → mehndi. Expected chronological result: mehndi → eve → ceremony → reception, including both same-day pairs.
2. Times represented with different UTC offsets, including equal instants. Expected order uses numeric instants with a stable event-ID tie-breaker.

Both tests failed against the prior committed backend in an isolated copy (2 failed). The fixed full backend suite passed: **67 tests, 0 failures**. This supplies before/after evidence even when a live guest's old assignment order happens to be chronological.

The previously approved live invitation was read without printing guest details or modifying responses. Before deployment it contained Ceremony → Reception and was already chronological. It therefore did not, by itself, reproduce the unordered-case defect.

## Deployment

Production deployment and post-release verification follow this tested change. Browser access is unavailable while macOS Computer Use permissions are pending; verification uses read-only production HTTP/API checks and regression evidence, without claiming a new visual browser test.
