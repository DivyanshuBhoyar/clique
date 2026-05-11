# ADR-0002: Use Convex Backend

## Status
Accepted
## Context
Needs realtime TypeScript backend for chat, presence, drops, memories, notes, vibes.
## Decision
Use Convex for data, auth integration, realtime subscriptions, storage URLs, crons.
## Consequences
Strong generated types/realtime fit; backend edits must follow `convex/_generated/ai/guidelines.md`.
