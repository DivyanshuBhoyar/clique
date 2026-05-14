# Progress

- Done: broken-flow fixes, core UX polish, image/chat/comment/reaction/bookmark basics, input validation, auth cleanup, drop detail UX cleanup, compact Drops card reactions/votes, Vibes past entries archive, low-complexity polish pass (haptics, join error toast, home settings sheet, personalized chat reactions, top Drops sort, tappable drop URLs, poll expiry chips, confession emoji picker).
- Next: loading skeletons, custom Vibe emoji, markdown rendering, note pin toggle, member list/profiles, squad settings, message search, read receipts, edit drops/memories.
- Quality bar: Notes feature polish; preserve native UX/accessibility and neo-brutalist tokens.
- Verify code with `bunx tsc --noEmit`, `bunx convex typecheck`, `bun run lint`.
- Constraints: root `AGENTS.md` is canonical; read Convex generated guidelines before Convex edits; keep `.context/` under 250 total lines.
