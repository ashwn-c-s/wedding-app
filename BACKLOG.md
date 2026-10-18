# Wedding app backlog

Updated 12 October 2026.

## Invitation recovery — revisit design before implementation

**Status:** Deferred at the owner's request. No invitation recovery UI or behaviour changes are included in the guest-tags release.

**Goal:** Explain why personalised invitation details are unavailable and give the guest a clear way to request the correct link.

Revisit the recovery card, first-screen mobile placement, wording, public-details fallback and contact flow with the owner before implementation. Distinguish an invalid/missing personal link from temporary API/network failures. Avoid revealing guest identities or putting failed invitation tokens into messages. Decide the organiser contact and preferred communication channel at that review.

The earlier proposal is recorded in [the design document](docs/guest-tags-and-invitation-recovery-design.md); it is a starting point for a better design, not approval to implement the recovery feature.
