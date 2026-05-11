# Style

- Tone: warm, playful, private friend-group; avoid enterprise/community-platform copy.
- UI: use `src/constants/theme.ts` tokens; warm cream, white cards, golden accent, 2px dark outlines, hard shadows, 4pt spacing grid.
- Prefer shared UI primitives before new variants; async flows need loading/empty/error/success feedback; destructive actions need confirmation.
- Accessibility: labels/roles on controls, no emoji-only unlabeled buttons, 44pt touch targets.
- Frontend: screens own Convex data calls; presentational components stay prop-driven; hooks in `src/hooks`; use optimistic hooks where established.
- Convex: read generated guidelines first; every function has validators; derive auth server-side; gate squad data with `requireMembership`; use `assertLength`/`assertNonEmpty`.
- Data: use indexes/pagination, avoid unbounded `.collect()`/`.filter()`, keep high-churn data in separate tables, enrich query results at boundary.
- Dev: smallest safe change, no new deps unless needed, trust current code over stale docs, update `.context` only with durable facts.
