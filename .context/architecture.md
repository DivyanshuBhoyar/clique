# Architecture

- App path: public auth → authenticated squad picker/create → `squad/[id]` tabs: Chat, Drops, Memories, Notes, Vibes; Bookmarks hidden from tabs.
- Root layout: `ConvexAuthProvider`, keyboard provider, nav theme, splash overlay, global toasts.
- Screens coordinate route/data with `useQuery`, `usePaginatedQuery`, `useMutation`; shared primitives in `src/components/ui`, feature UI in domain folders.
- Convex source of truth: `convex/schema.ts`; domain APIs split across `squad`, `channel`, `message`, `drops`, `memories`, `notes`, `vibes`, `polls`, `questions`, `confessions`, `bookmarks`, `users`.
- Shared backend helpers: `requireMembership`, `enrichUser`, `getAvatarUrl`, `assertLength`, `assertNonEmpty`.
- Data groups: core users/squads/memberships; chat channels/messages/typing/read/reactions; drops; memories; notes/collaborators; vibes; bookmarks/presence.
- Query pattern: validate membership from squad/target doc, bound or paginate feeds, enrich rows with user/avatar/reaction/vote/bookmark metadata.
- Mutation pattern: derive user server-side, validate membership/ownership/input limits, use indexes, clean dependent rows where practical.
- Media: client compresses/uploads to Convex storage; backend stores `storageId`; queries resolve URLs with `ctx.storage.getUrl()`.
- Realtime: Convex subscriptions power feeds, chat, typing, presence, unread, notes, drops, memories, vibes.
