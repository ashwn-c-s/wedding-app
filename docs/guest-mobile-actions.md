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
