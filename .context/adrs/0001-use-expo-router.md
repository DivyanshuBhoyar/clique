# ADR-0001: Use Expo Router

## Status
Accepted
## Context
Expo app needs file-based mobile/web routing.
## Decision
Use Expo Router; route source is `src/app`, entrypoint is `expo-router/entry`.
## Consequences
Fast screen discovery/deep links; route structure is file-structure-coupled.
