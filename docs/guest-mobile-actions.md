# Guest list mobile actions

18 October 2026

- Group guest identity as name, phone, then tags on desktop and mobile. Remove the separate phone and tag columns.
- Use clipboard, WhatsApp, link and pencil icons for Copy invitation, WhatsApp, Open invitation and Edit guest.
- Copy invitation writes the complete personalised event invitation, matching the WhatsApp message, to the clipboard. Open invitation retains the personalised URL.
- Give each action a guest-specific accessible name, a title, a 44-pixel target and a visible keyboard focus outline. Decorative SVGs are hidden from assistive technology.
- Below 700px, display guest rows as cards with the details, party size, invited events and all four actions stacked within the available width. Table roles and headers remain in the accessibility tree.
- Adding/editing a guest focuses the name field after the editor renders.

Verification: 90 frontend tests pass. Rendered component tests verify identity ordering, named actions, links, opening the editor, clipboard content, success announcement and failed-copy feedback. Production Angular build succeeds with only the pre-existing gallery stylesheet budget warning. No database changes.

Limitation: visual mobile/browser and manual screen-reader checks were unavailable because Computer Use reported that the Mac is locked and exposed no browser. Responsive behavior is source-supported; automated DOM checks do not prove visual rendering.


## Card/list view toggle

Added an accessible Cards/List toggle above the guest collection. Cards are the default on every screen size; list mode uses a table on desktop and compact rows below 700px, keeping all four 44-pixel actions visible without requiring a wide mobile table. Both views share the same guest rows, filters, sharing actions and editor state. The toggle exposes its selected state with aria-pressed. The selection lasts for the current page session.

Validation: all 91 frontend tests pass, including switching both directions while preserving filters and an unsaved draft, empty results in list mode, and copying an invitation from list mode. Production build passes with the same existing gallery stylesheet warning. The earlier visual browser verification limitation remains.

## List table clarification

List view now shows exactly five columns: Name, Phone, Party size, Invited events and Edit. It renders only the pencil action and omits tag chips; Cards retain stacked identity details and all sharing actions. List remains a table at mobile widths, inside a keyboard-focusable horizontal scroll region with the edit column fixed at the right edge using sticky positioning.

Validation: 92 frontend tests pass. Tests verify the five headers and matching cell values, a single edit action per list row, editing from the pencil, preserved filters/draft across toggles, and four sharing/edit actions with tags when returning to Cards. Production build passes with the pre-existing gallery budget warning. Manual mobile visual verification remains unavailable.
