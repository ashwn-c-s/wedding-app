# Guest tags and invitation recovery — proposed design

Design review draft · 12 October 2026. Guest tags approved and implemented locally; database migration/release pending. Invitation recovery deferred for a better design review; see BACKLOG.md.

## Current behaviour and purpose

The Guests page supports search by name/phone and explicit event assignment, but has no grouping labels. The invitation page currently falls back to general wedding/reception details when a token is malformed or unavailable, without explaining why the personal greeting and RSVP disappeared. Temporary API failures already have retry behaviour and must remain a separate state.

This proposal helps the organiser identify guest groups and gives an affected guest a clear path to request their correct personal link.

## 1. Private, reusable guest tags

### Interaction

- A guest can have zero or multiple tags, for example Office friends, Father's relatives and School friends. These are labels for the entire invitation/party, not individual family members.
- Add a Tags field to Add/Edit guest after party size and before Invited events. Selected tags appear as removable chips.
- A searchable picker offers existing tags. If no matching label exists, Create & add places a new tag in the draft. It is created only when Save guest succeeds; cancel leaves no new database tag behind.
- Tag names are trimmed, repeated spaces collapse, and matching ignores case. Office friends and office friends resolve to the same tag while preserving its chosen display name. Proposed limits: 40 characters per tag and 10 tags per guest. Keyboard entry, native buttons and explicit remove labels support touch and keyboard use.
- Save guest saves details, event assignments and selected tags together. Failed saves retain the draft with a clear retry message.
- Submitted RSVPs keep their existing event restrictions. Organisers can still change tags; changing a tag never changes an event invitation, party size, invitation URL or RSVP.

### Guest list and reporting

- Add a Tags column; mobile guest cards/rows show tags under the name.
- Add a single tag filter: All tags, each reusable tag, and Untagged. Search and tag filters combine. Selecting Office friends shows every guest with that tag, even if they also have other tags.
- Add the same filter to the full-admin RSVP dashboard. All attendance counts and CSV export follow the selected tag plus the existing event/search filters. Count each invitation once even when it has several tags.
- Full administrators can see/manage tags. Tags are absent from public invitation/gallery responses and restricted-admin responses. They remain private organiser information.
- Provide a compact Manage tags dialog for renaming existing labels. It shows how many guests will be affected and requires an explicit Save rename action. Removing a tag from one guest does not rename/remove it for other guests.
- Hard deletion of shared tags and bulk tag edits are outside the initial scope. Unused labels may remain in the catalogue.

### CSV compatibility

- Existing four-column guest imports continue unchanged and preserve any existing tags.
- Allow an optional final `tags` column, with labels separated by `|`, e.g. `Office friends|School friends`. Disallow `|` within a tag name.
- Import adds the supplied tags to an existing guest's tags. Blank/omitted tag cells preserve existing assignments; they never silently clear them. New guests with a blank cell have no tags.
- Manual guest editing is the way to remove a tag. Validate names and limits per row, and report tag errors without leaving partial guest/tag/event saves.
- Export displays readable names separated by `|`, using the existing CSV escaping rules.

### Proposed data/API design

- Add a reusable tag catalogue table (`guest_tags`: UUID, display name, unique normalized name, timestamps) and an assignment table (`guest_tag_assignments`: guest ID + tag ID, unique pair).
- Use tag IDs for stable assignments; names are resolved/displayed separately. A rename automatically updates the display for every assigned guest.
- Enable RLS on new tables. Backend service-role access handles approved operations; direct anonymous/authenticated access is denied by default. Full-admin checks are enforced by backend endpoints as well as UI guards.
- Add full-admin catalogue list/create/rename endpoints and extend guest/admin dashboard responses with tags. Guest-save input carries existing tag IDs and draft new names.
- Introduce a versioned service-role-only guest-save RPC that resolves/creates labels and saves guest details, events and tags in the same transaction, retaining the shared guest-row lock and all existing RSVP protections. Keep the current RPC available for deployment compatibility. Concurrent creation of the same normalized name reuses one catalogue entry.
- Deploy reviewed SQL before backend/frontend integration. Existing guests start untagged; no invitation tokens or RSVP records are rewritten.

## 2. Clear invitation recovery

### Recommended layout

When a supplied personal link is malformed or the invitation API says it is unavailable, show a recovery card immediately below navigation, before the decorative invitation hero. The card should be the first meaningful content on a mobile screen and retain the cream/forest/gold wedding styling.

Heading:

> We couldn't open your personal invitation

Message:

> This link may be incomplete or no longer available. Ask the organiser to resend your personal invitation so you can view your invited events and RSVP.

Primary action: **Request invitation link**

Secondary action: **View general wedding details**

The secondary action displays the existing public wedding/reception information, labelled General celebration information. It does not imply that these are the guest's assigned events. The recovery notice remains available; no personalised greeting or RSVP action is shown until a valid invitation loads.

### Request behaviour

- Open WhatsApp to one owner-selected organiser contact with a prepared, editable message. The guest chooses whether to send it; the app does not send messages automatically.
- Suggested text: "Hi, I couldn't open my personal invitation for Ashwin & Amritha's wedding. Could you please resend the correct link? My name is ____."
- Do not include the failed token, full invitation URL, inferred guest identity or tags in the message. The organiser verifies the requester against the Guests list and sends the correct existing invitation link.
- Show the configured organiser contact visibly, with a Copy request message fallback if WhatsApp cannot be used. No public guest-name/phone lookup or automatic invitation-token issuance.
- The exact organiser contact is a review decision; the mockup uses a placeholder and does not contact anyone.

### Distinct states

| State | Behaviour |
| --- | --- |
| Valid personal invitation | Existing greeting, assigned events and RSVP remain. No recovery notice. |
| Malformed or unavailable personal link | Show recovery message and request action. General details are secondary. |
| Root/public page without a personal link | Neutral helper: Looking for your personal invitation? Use the personal link sent by the organiser to see your invited events and RSVP. Provide the request action without presenting an error. |
| Network timeout/API service failure | Show a loading-failure message and Try again. Do not imply that the link is invalid. |
| Valid invitation with no currently visible events | Explain that event details are not available yet and offer contact help; do not label the invitation invalid. |
| Invalid RSVP/venue/confirmation deep link | Return to the same recovery flow while preserving only public navigation. |

### Implementation boundaries

- Track explicit invitation state rather than inferring failure from a missing guest object.
- Existing validation failures (400/401/403/404/410) use the same non-identifying recovery message. Service/network errors retain retry behaviour.
- Recovery must remain visible even if fetching public event details also fails. Loading announcements/errors should be accessible and should not announce a stale state after navigation.
- Store the approved organiser contact in one shared configuration consumed by the help UI. Avoid a request-inbox table, CAPTCHA or account creation for this first version.

## Delivery plan after design review

1. Confirm tag/filter behaviour and the organiser contact/channel.
2. Prepare exact new-table/RLS/RPC SQL and a migration rollback plan for separate owner review. Design approval is not permission to apply a database migration.
3. Implement backend tag authorization and transactional guest saves; retain old-client/CSV compatibility.
4. Implement guest editor chips, list/dashboard filters and CSV integration, preserving unrelated local UI work.
5. Implement the recovery component/state handling and configured contact actions.
6. Validate both persona journeys, then release using the existing deployment workflow after release authorization.

## Acceptance checks

### Organiser

- Create/edit a guest with multiple tags; refresh retains the labels.
- Mixed-case/space variants do not create duplicate labels; concurrent creation also produces one tag.
- Search plus tag plus event filters and attendance totals are consistent; multi-tag guests are not double-counted.
- Change tags after an RSVP without modifying the RSVP or locked event assignments.
- A failed transaction saves none of the guest, newly created tags or assignments. The draft remains available for correction/retry.
- Existing CSVs preserve tags, extended imports add tags, and malformed rows are reported independently.
- Public and restricted-admin APIs never return private tags or allow tag edits.

### Invitation reader

- Invalid, missing-personal and temporary-failure states show the correct distinct messages.
- Recovery is visible without scrolling on a narrow screen; general event details never enable an RSVP for an unrecognised guest.
- Request action opens the approved contact with the intended editable draft, containing no failed token. Copy fallback works without automatically contacting anyone.
- Valid personalised links continue to load only permitted events and the existing RSVP confirmation flow.

## Review decisions

Recommended baseline: multiple private tags; one tag filter at a time; tags included in full-admin dashboard/export; CSV imports add labels while preserving existing ones; WhatsApp request with a copy fallback.

Before implementation, confirm whether the request action should use WhatsApp or a different contact channel, and identify the organiser contact to display. All mockup names/rows are sample data.
