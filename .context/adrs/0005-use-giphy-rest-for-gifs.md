# ADR-0005: Use GIPHY REST for GIFs

## Status
Accepted

## Context

Need:
- GIF picker in channel chat and comments
- low maintenance burden
- Expo iOS/Android/web compatibility
- no Tenor dependency

Alternatives considered:
- GIPHY React Native SDK
- `@giphy/js-fetch-api`
- unofficial React Native GIF pickers
- native keyboard GIF ingestion

## Decision

Use GIPHY public REST API via a small internal fetch wrapper.

Render GIFs with existing `expo-image`.
Store selected GIF metadata/URLs on messages/comments.
Defer native keyboard GIF ingestion and E2EE DM GIFs.

## Consequences

Positive:
- no native module or SDK lifecycle burden
- one reusable picker across native and web
- full app-native styling/accessibility
- no new dependency required

Negative:
- custom picker UI required
- GIPHY analytics pingbacks must be implemented manually
- API response mapping must be maintained locally

## Notes

Use `EXPO_PUBLIC_GIPHY_API_KEY`, GIPHY random ID, rating filters, attribution, and analytics pingbacks.