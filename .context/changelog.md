# Changelog

- 2026-05-14: Added Notes markdown rendering via `react-native-markdown-display`; cards strip raw markdown markers and editor shows a rendered preview card.
- 2026-05-14: Added note-card pin/unpin toggles for owned notes in the Notes feed using existing `toggleNotePin` mutation.
- 2026-05-14: Added `Custom` tile to Vibe picker; opens shared emoji picker and reuses existing optional label + `setVibe` flow.
- 2026-05-13: Shipped low-complexity polish: haptics helper, join error toast, home settings sheet with deliberate sign-out, most-used chat quick reactions, Drops Top sort, tappable drop URLs, poll expiry chips, and confession `+` emoji picker.
- 2026-05-11: Added Vibes archive route for past weekly questions and older polls; main Vibes page now shows a recent poll slice plus a past entries link.
- 2026-05-07: Updated Drops cards: muted compact overlapping reaction stack on list cards, full-row detail reaction strip, per-emoji user reaction toggles, and always-relative timestamps.
- 2026-05-06: Compacted `DropCard` footer into one author/action row to preserve hierarchy without extra vertical space.
- 2026-05-06: Reworked `DropCard` hierarchy: content leads, author attribution moved to lower context row, and social actions sit last.
- 2026-05-06: Tightened drop detail comments: compact section heading, slimmer cards, and minimal right-aligned comment voting.
- 2026-05-06: Polished drop detail UX: removed duplicated action rows, made comment composer functional, improved comment card spacing/accessibility, and returned `commentCount` from `getDrop`.
- 2026-05-06: Bootstrapped and compressed `.context/`; added overview, architecture, glossary, style, pitfalls, ADRs; kept root `AGENTS.md` canonical.
