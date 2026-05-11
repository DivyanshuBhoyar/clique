# Known Pitfalls

- Do not add `.github/copilot-instructions.md` while root `AGENTS.md` is canonical.
- Convex assumptions drift; read `convex/_generated/ai/guidelines.md` before backend edits.
- Expo Go cannot run native modules like WebRTC; use a dev client.
- Full cascade deletes are incomplete; clean dependents when touching destructive flows.
- Dark mode is light-only today: `use-theme.ts` returns light tokens.
- `bun run lint` currently fails on unrelated unescaped apostrophes in public auth screens; run `bunx tsc --noEmit` for targeted type safety until lint debt is cleared.
