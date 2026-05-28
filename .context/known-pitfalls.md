# Known Pitfalls

- Do not add `.github/copilot-instructions.md` while root `AGENTS.md` is canonical.
- Convex assumptions drift; read `convex/_generated/ai/guidelines.md` before backend edits.
- Expo Go cannot run native modules like WebRTC; use a dev client.
- Expo SQLite web needs documented setup: Metro `wasm` asset support plus COEP/COOP headers for `SharedArrayBuffer`.
- E2EE web keys use IndexedDB, not SecureStore; treat web as weaker than native and keep `registerDevice` idempotent after auth.
- DM local SQLite reads can race auth-layout startup; every `local-db` operation must await shared lazy initialization, not assume `initLocalDb()` already finished.
- Expo Router `back()` warns if a screen was deep-linked/refreshed with no stack history; use `backOrReplace(router, fallback)` for headers/actions.
- Convex public APIs are internet-facing; new mutations should use `SECURITY_LIMITS` + `assertRateLimit`, and new feeds must cap pagination/read amplification.
- GIPHY REST integration needs visible attribution plus `onload`/`onclick`/`onsent` pingbacks; do not send app user IDs, use GIPHY random ID.
- TweetNaCl can keep `no PRNG` if imported before random polyfill setup; import through `src/lib/nacl.ts` only and use `secureRandomBytes()` for nonces.
- Convex queries are data-driven, not timer-driven; typing indicators must expire client-side by typing-event version (`lastTypingAt`) so stale mobile rows do not reappear.
- Full cascade deletes are incomplete; clean dependents when touching destructive flows.
- Dark mode is light-only today: `use-theme.ts` returns light tokens.
- `bun run lint` currently exits 0 with warnings; do not assume a clean warning-free baseline.
