# WhatsApp event invitations

The admin guest WhatsApp action now builds a personalised greeting followed by each assigned, visible event in chronological timestamp order. Each block contains the event name, date, exact time in IST, venue name when available, and map link. The personalised invitation and RSVP link remains at the end.

Stored map links are reused when valid HTTP(S) URLs; otherwise a Google Maps venue/address search is generated. Missing locations are marked as to be announced. Legacy date-only events retain their time label rather than displaying an invented midnight time. Copy invitation link continues to copy only the URL.

Validation on 18 October 2026:
- All 87 frontend tests pass, including five new sharing regressions.
- Production Angular build succeeds; existing gallery stylesheet budget warning remains.
- No database migration or guest data changes are required.
- No WhatsApp messages were sent during verification. End-to-end validation inside WhatsApp was not performed.
