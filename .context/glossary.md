# Glossary

- Squad: private friend group workspace; Membership: user↔squad row with nickname/vibe/status.
- Channel: squad chat room; types: main, topic, mood, thread, ephemeral.
- Drop: recommendation/share post with votes, comments, reactions.
- Memory: wall/event scrapbook entry; Memory item: event child reflection/photo/link.
- Note: personal/shared/friend/journal writing item; collaborator rows track editors.
- Vibes: member vibe status plus polls, confessions, weekly questions.
- Bookmark: user-scoped save for message/drop/note/memory.
- Reaction/Comment/Vote: feature-specific social rows; do not merge tables casually.
- Presence/Typing/Read status: high-churn operational tables.
- Enrichment: query adds derived user/avatar/reaction/vote/bookmark data to docs.
- Membership gate: `requireMembership(ctx, squadId)` authorization boundary.
- Soft delete: row remains, content hidden via `deleted`/empty payload.
- UI primitives: `ScreenHeader`, `EmptyState`, `ConfirmDialog`, `ToastHost`, `EmojiReactionStrip`, `FilterChips`, `DashedSeparator`, `Fab`.
