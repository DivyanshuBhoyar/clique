# Overview

- Homie Squad: private, cozy friend-group app; squads chat, share drops, save memories, write notes/journals, answer vibes prompts.
- Stack: Expo 55 + React Native 0.83 + React 19 + Expo Router; Convex 1.34 + Convex Auth; TypeScript; lucide icons.
- Auth: email OTP via Resend + Google; Convex auth stored in SecureStore native / localStorage web.
- Main folders: `src/app` routes, `src/components` UI, `src/hooks` client helpers, `convex` schema/functions/auth.
- Core features: chat, drops, memories, notes, vibes, bookmarks; Notes is current polish benchmark.
- Commands: `bun run start:expo`, `bun run start:convex`, `bunx tsc --noEmit`, `bunx convex typecheck`, `bun run lint`.
- Canonical instructions: root `AGENTS.md`; session OS: `tasks/OS.md`; `.context/` is only lightweight repo memory.
