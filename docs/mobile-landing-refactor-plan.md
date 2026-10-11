# Mobile-first landing page refactoring plan

Reviewed 11 October 2026. Scope: guest landing page and its shared navigation, countdown, and footer. The initial review and proposed design follow below.

## Current local implementation

At the owner's request, the original hero has been restored: illustration first on mobile, followed by the script names, invitation label, personalized greeting, original family invitation message, date, and location. The original gradient, illustration sizing, and desktop layout are restored. The separate RSVP section, restored four-part countdown, refactored event cards, and footer with blessings text remain. The opening-screen scroll arrow has been removed.

Verified the restored mobile hero in the browser at 390 × 844. All 73 frontend tests pass and the production build passes with the existing Gallery stylesheet size warning.

Mobile preview: [screenshot](mobile-landing-preview.jpg). The original audit and proposed compact design below are historical context; the owner's request to restore the original hero takes precedence.

## Design direction

Keep the invitation's warm Kerala-inspired character: couple illustration, cream background, forest green, terracotta accents, and script names. Refactor the hierarchy so guests can recognize the invitation, respond, and find their event details quickly on a phone.

Working assumption: RSVP is the main action for a valid personalized invitation; viewing events is the main action for public visitors. For returning guests, event times and directions become the main utility.

## Evidence and limits

- Inspected the local public landing page in the Codex browser at 390 × 844 and 320 × 740, including the expanded mobile navigation.
- At 390 × 844, the hero starts about 61 px from the top and is about 1,027 px tall. The wedding date is below the first viewport. The countdown occupies approximately 262 px; the events section begins around 1,350 px; the first Directions action begins around 1,860 px.
- At 320 px, the invitation paragraph has visibly uneven word spacing, the countdown is crowded, and event action labels wrap. The menu button measures approximately 24 × 29 px.
- Source review confirms that the landing hero has no RSVP action. Personalized RSVP is currently exposed through shared navigation and the footer. Personalized rendering was not browser-tested during this review.
- Source review shows 10–12 px metadata, justified invitation copy, a priority 1024 × 1536 illustration, and loading/error feedback positioned in the lower events section. The illustration file is about 525 KB; this is asset evidence, not a measured performance result.
- The local page changed during inspection, including Gallery appearing in shared navigation. Treat navigation destinations as existing product scope and confirm their final set before implementation.
- This review is not a physical-device, Safari, screen-reader, or performance certification.

## Findings, in priority order

| Priority | Finding | Refactoring decision |
| --- | --- | --- |
| High | Illustration dominates the first screen; date and actions arrive late. | Constrain mobile artwork and put names, date, and a useful action in the initial viewport. |
| High | RSVP requires discovering the menu or reaching the footer. | Add a prominent hero RSVP action after a personalized invitation is validated. |
| High | Event information follows a large decorative countdown section. | Put the event list immediately after the compact hero; make countdown a small supporting line. |
| Medium | Justified body copy produces gaps at narrow widths. | Use a short centered welcome; use left alignment for longer copy. |
| Medium | Small, muted metadata is harder to scan. | Give time and venue stronger hierarchy, larger text, and darker colors. |
| Medium | Mobile menu toggle has a small interaction area. | Use a 48 × 48 px button with visible focus and an explicit Menu label where space permits. |
| Medium | Equal-width event actions become cramped. | Give Directions a full-width row, with a quieter calendar action below it on narrow screens. |
| Medium | Delayed or failed invitation loading is communicated far down the page. | Reserve space for greeting and actions, and put relevant loading/retry feedback near them. |
| Low | Large photos, card shadows, separators, and icons compete with practical information. | Reduce photo height and decoration; retain enough imagery for recognition and warmth. |

## Proposed mobile page

```text
Compact header: A & A                         Menu

                 Wedding invitation
                  Ashwin & Amritha
             Dear [guest], join our celebration
                 Sunday, 15 November 2026
                   Ottapalam · Thrissur

           Couple illustration, about 220–260 px tall

               [ RSVP to your invitation ]
                      View your events ↓
                    34 days to celebrate

Your celebrations
  Wedding Ceremony
  Sun, 15 Nov · [host-confirmed time]
  KM Auditorium, Manissery
  Compact venue photograph
  [ Get directions                      ]
    Add to calendar

  Wedding Reception
  Sun, 15 Nov · [host-confirmed time]
  La Maria Castle, Kechery
  Compact venue photograph
  [ Get directions                      ]
    Add to calendar

Short family invitation message / About us link
Quiet footer navigation
```

For public or invalid invitations, use “View events” as the hero button and omit personal greeting and RSVP. Do not infer private event access from the URL alone. On very short screens, reduce or move artwork further down; essential content takes precedence over fitting a fixed illustration height.

The original family invitation wording can remain below events so the page still feels personal. Suggested short hero copy: “With our families, we invite you to celebrate our wedding.”

## Visual and interaction specifications

- Mobile gutters: 20 px, reducing to 16 px on the narrowest screens. Use an 8 px spacing rhythm, approximately 32–40 px between sections, and 16–20 px card padding.
- Keep script typography for names only. Start around 44–52 px and tune against actual wrapping. Use readable serif event headings around 20 px; body text around 16 px; useful metadata and button text around 14–16 px.
- Keep cream as the primary canvas. Use white cards, restrained shadows, and one consistent dark text color. Re-evaluate muted green and gold where they convey essential information.
- Use meaningful headings: one h1 for the couple, h2 for events, and h3 for event names. Add a main landmark; hide decorative icon text from assistive technology.
- Give interactive controls at least a 48 px touch area as a project design target. Keep keyboard focus visible and support text enlargement without clipping or overlap.
- Prefer a natural document layout. Remove mobile dependence on large viewport minimum heights, oversized image transforms, and desktop image positioning tricks.
- Render event date, time, and venue as distinct lines. Use exact host-confirmed time labels where available; do not invent a time from “Morning” or “Evening.”
- A sticky RSVP action is optional after the hero action scrolls away. Introduce it only if the compact hero still leaves RSVP difficult to reach; account for phone safe areas and footer clearance. Do not add multiple persistent navigation bars.
- Keep the countdown to days, or days/hours, as a quiet line. Define explicit India-time behavior and replace it with an appropriate wedding-day/post-event message instead of permanent zeros.
- For returning guests, consider “View your response” after confirmed RSVP. This requires RSVP-status data, so treat it as a second-stage behavior change rather than a styling shortcut.

## Implementation sequence

1. **Hierarchy and hero:** refactor `landing.html` and `landing.scss`; add validated-invite RSVP routing, public event anchor, compact art, short copy, and a main landmark. Keep current invitation authorization and fallback behavior.
2. **Events:** rebuild cards around event title, date/time, venue, and Directions. Reduce mobile image height to roughly 120–160 px. Stack actions at narrow widths. Preserve existing map URL handling and calendar behavior.
3. **Shared components:** improve navigation touch areas and menu behavior, compact the countdown, simplify footer emphasis, and align guest typography/spacing tokens. Review other guest pages because these components are shared.
4. **States and assets:** bring loading/error feedback closer to affected content, reserve layout space, use suitably sized responsive image assets, and verify priority loading stays limited to the main illustration. Add RSVP-status behavior only if included in implementation scope.
5. **Verification:** check the journeys and device widths below, run the existing relevant frontend tests and production build, and inspect the resulting mobile screenshots before accepting the refactor.

## Acceptance criteria

- At 390 × 844 and 360 × 800, names, date, and the appropriate main action are visible without scrolling after data loads.
- At 320 px, no horizontal scrolling, clipped countdown labels, or cramped two-column action buttons. At short viewport heights, the artwork yields space to essential information.
- The event heading or first event appears within approximately one additional viewport after the hero, subject to text enlargement.
- Guests with valid invitations can reach RSVP in one tap from the hero and see only their assigned events. Public/invalid visitors see public events without an RSVP action.
- Check a long guest name, multiple events, missing venue/address/time, loading, network failure/retry, and invitation changes. Preserve the existing cancellation and private-data-clearing behavior.
- Directions and calendar links remain attached to the correct event. Calendar labels accurately describe the existing Google Calendar destination; broader calendar support is a separate scope decision.
- Check keyboard focus, menu open/close behavior, readable contrast, and enlarged text. Verify the menu's intended placement instead of assuming `sticky` on its inner element works across the component host.
- Validate 320, 360, 390, and 430 px widths plus tablet/desktop. Include iOS Safari and Android Chrome or clearly record any untested browser/device.
- Retest shared navigation/footer on RSVP, confirmation, venues, and About pages, plus Gallery if it remains a navigation destination. Do not expand this change into admin UI work.

## Recommended first refactor

Ship the compact hero with a visible action, shorter countdown, clearer event cards, and improved mobile typography/touch areas first. These address the largest usability problems while preserving the existing illustration and wedding identity.
