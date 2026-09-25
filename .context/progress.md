# Progress

## Now
- Chat UI refinement shipped (light-only, matching the app's light-only design): chat token set in `theme.ts`, accent-only-for-send/unread/links/mentions, 16/16/4/16 & 16/16/16/4 bubbles, quote blocks (radius 0 + 3px bar), surface reaction pills — applied consistently across squad chat, DMs, channel cards/modals, composers, link previews, empty states. Shared components still on base palette by design.
- Web Push L2b code-complete + desktop-verified shape: native-only expo-notifications, SW, dual send, PWA/iOS A2HS manifest + banner/settings + `pushsubscriptionchange`. **Next: T5 desktop HTTPS QA + (later) iPhone smoke.**
- Project OS wired; Phase A test release still the ship runway.
- Active learn: L2 native push QA · L2b web push verify · L3 ship path.
## Pitfalls (chat UI session)
- Multi-block `replace_in_file` duplicates content instead of replacing → single-block replaces or full `write_to_file` rewrites only.
- `expo lint` caches at `.expo/cache/eslint/`; stale cache can report parse errors on already-fixed files → clear it after bulk edits.

## Next (max 3 near-term)
1. Generate VAPID keys; set Convex `WEB_PUSH_VAPID_*` + client `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`; verify background web notification.
2. Physical-device notification QA (chat/DM/reply channels, sticky Android channels).
3. Phase A §0 decisions + EAS/CF env (incl. GIPHY key) for preview rebuild.

## Later (parking)
- rateLimits cleanup cron · edit drops · delete memory items · channel delete · message search · threaded replies · ownership transfer · E2EE receipt hardening.

## Done (compressed)
- Core squad product loops: chat/channels, drops, memories, notes (quality bar), vibes/weekly questions, members/settings, private channels, Lounge hero.
- E2EE DM core + web keys/SQLite; optimistic DM; push infra + contextual no-preview + suppression; GIPHY path; calls heartbeats/stale cleanup; security limits/rate gates; micro-interactions partial; Space nomenclature planned.
- Full dated history: `.context/changelog.md`.

## Quality / verify
- Bar: Notes polish · neo-brutalist tokens · a11y.
- `bunx tsc --noEmit` · `bunx convex typecheck` · `bun run lint`.
- Constraints: `AGENTS.md` canonical · Convex AI guidelines before backend edits · keep `.context/` lean · lessons only in `tasks/lessons.md`.
