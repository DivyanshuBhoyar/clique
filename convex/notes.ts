import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertPaginationLimit, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength } from "./validators";

const notesFeedFilterValidator = v.union(
    v.literal("all"),
    v.literal("pinned"),
    v.literal("recent"),
    v.literal("mine"),
);

function canViewNote(note: { type: string; ownerId: Id<"users">; targetUserId?: Id<"users"> }, userId: Id<"users">) {
    if (note.type === "shared") return true;
    if (note.type === "personal" || note.type === "journal") {
        return note.ownerId === userId;
    }
    if (note.type === "friend") {
        return note.ownerId === userId || note.targetUserId === userId;
    }
    return false;
}

function matchesSearch(note: { title: string; content: string }, searchText?: string | null) {
    const q = searchText?.trim().toLowerCase();
    if (!q) return true;
    return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
}

function sortFeedNotes<T extends { pinned?: boolean; updatedAt: number }>(
    notes: T[],
    filter: "all" | "pinned" | "recent" | "mine",
) {
    const ranked = [...notes];
    if (filter === "all" || filter === "mine" || filter === "pinned") {
        ranked.sort(
            (a, b) =>
                Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
                b.updatedAt - a.updatedAt,
        );
        return ranked;
    }

    ranked.sort((a, b) => b.updatedAt - a.updatedAt);
    return ranked;
}

async function touchNoteCollaborator(
    ctx: MutationCtx,
    noteId: Id<"notes">,
    squadId: Id<"squads">,
    userId: Id<"users">,
    editedAt: number,
) {
    const existing = await ctx.db
        .query("noteCollaborators")
        .withIndex("by_user_and_note", (q) => q.eq("userId", userId).eq("noteId", noteId))
        .unique();

    if (existing) {
        await ctx.db.patch(existing._id, { lastEditedAt: editedAt, squadId });
        return;
    }

    await ctx.db.insert("noteCollaborators", {
        noteId,
        userId,
        squadId,
        lastEditedAt: editedAt,
    });
}

async function buildCollaboratorPreview(
    ctx: QueryCtx,
    note: { _id: Id<"notes">; ownerId: Id<"users">; squadId: Id<"squads"> },
) {
    const collaboratorRows = await ctx.db
        .query("noteCollaborators")
        .withIndex("by_note_and_lastEditedAt", (q) => q.eq("noteId", note._id))
        .order("desc")
        .take(8);

    const orderedUserIds: Id<"users">[] = [
        note.ownerId,
        ...collaboratorRows.map((row) => row.userId),
    ];

    const uniqueUserIds: Id<"users">[] = [];
    for (const id of orderedUserIds) {
        if (!uniqueUserIds.includes(id)) {
            uniqueUserIds.push(id);
        }
    }

    const previewUserIds = uniqueUserIds.slice(0, 3);
    const collaborators = await Promise.all(
        previewUserIds.map(async (userId) => {
            const { nickname, avatarUrl } = await enrichUser(ctx, userId, note.squadId);
            return {
                userId,
                nickname,
                avatarUrl,
            };
        }),
    );

    return {
        collaborators,
        collaboratorCount: uniqueUserIds.length,
    };
}

export const createNote = mutation({
    args: {
        squadId: v.id("squads"),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("personal"),
            v.literal("shared"),
            v.literal("friend"),
            v.literal("journal"),
        ),
        targetUserId: v.optional(v.id("users")),
        channelId: v.optional(v.id("channels")),
        tag: v.optional(v.string()),
        pinned: v.optional(v.boolean()),
        // Journal encryption: content is ciphertext when encrypted === true
        encrypted: v.optional(v.boolean()),
        nonce: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const now = Date.now();

        await assertRateLimit(ctx, ["createNote", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);

        assertLength("Title", args.title, 200);
        assertLength("Content", args.content, 10000);
        if (args.tag) assertLength("Tag", args.tag, 50);

        const existingNotes = await ctx.db
            .query("notes")
            .withIndex("by_owner_squad", (q) => q.eq("ownerId", userId).eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxNotesPerUserPerSquad);
        if (existingNotes.length >= SECURITY_LIMITS.content.maxNotesPerUserPerSquad) {
            throw new Error(`You can create up to ${SECURITY_LIMITS.content.maxNotesPerUserPerSquad} notes in one squad`);
        }

        if (args.type === "friend" && !args.targetUserId) {
            throw new Error("targetUserId required for friend note");
        }
        if (args.targetUserId) {
            const targetMembership = await ctx.db
                .query("memberships")
                .withIndex("by_user_squad", (q) => q.eq("userId", args.targetUserId!).eq("squadId", args.squadId))
                .first();
            if (!targetMembership) throw new Error("Friend notes must target a squad member");
        }
        if (args.channelId) {
            const channel = await ctx.db.get(args.channelId);
            if (!channel || channel.squadId !== args.squadId) throw new Error("Invalid channel");
        }

        const noteId = await ctx.db.insert("notes", {
            squadId: args.squadId,
            title: args.title,
            content: args.content,
            type: args.type,
            ownerId: userId,
            targetUserId: args.targetUserId,
            channelId: args.channelId,
            tag: args.tag,
            pinned: args.pinned,
            encrypted: args.encrypted,
            nonce: args.nonce,
            createdAt: now,
            updatedAt: now,
        });

        await touchNoteCollaborator(ctx, noteId, args.squadId, userId, now);

        return noteId;
    },
});

export const updateNote = mutation({
    args: {
        noteId: v.id("notes"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        tag: v.optional(v.string()),
        pinned: v.optional(v.boolean()),
        // Journal encryption: pass when saving encrypted content
        encrypted: v.optional(v.boolean()),
        nonce: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        if (args.title) assertLength("Title", args.title, 200);
        if (args.content) assertLength("Content", args.content, 10000);
        if (args.tag) assertLength("Tag", args.tag, 50);

        const note = await ctx.db.get(args.noteId);
        if (!note) throw new Error("Note not found");

        if (note.type !== "shared" && note.ownerId !== userId) {
            throw new Error("Unauthorized");
        }
        if (note.type === "shared") {
            await requireMembership(ctx, note.squadId);
        }

        await assertRateLimit(ctx, ["updateNote", note.squadId, userId], SECURITY_LIMITS.rate.noteUpdate);

        const now = Date.now();
        const updates: Record<string, unknown> = {
            updatedAt: now,
            lastEditedBy: userId,
        };
        if (args.title !== undefined) updates.title = args.title;
        if (args.content !== undefined) updates.content = args.content;
        if (args.tag !== undefined) updates.tag = args.tag;
        if (args.pinned !== undefined) updates.pinned = args.pinned;
        if (args.encrypted !== undefined) updates.encrypted = args.encrypted;
        if (args.nonce !== undefined) updates.nonce = args.nonce;

        await ctx.db.patch(args.noteId, updates);
        await touchNoteCollaborator(ctx, args.noteId, note.squadId, userId, now);

        return { success: true };
    },
});

export const toggleNotePin = mutation({
    args: { noteId: v.id("notes") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");
        const note = await ctx.db.get(args.noteId);
        if (!note) throw new Error("Note not found");

        if (note.type === "shared") {
            await requireMembership(ctx, note.squadId);
        } else if (note.ownerId !== userId) {
            throw new Error("Unauthorized");
        }

        const now = Date.now();
        const pinned = !note.pinned;
        await ctx.db.patch(args.noteId, {
            pinned,
            updatedAt: now,
            lastEditedBy: userId,
        });
        await touchNoteCollaborator(ctx, args.noteId, note.squadId, userId, now);
        return { pinned };
    },
});

export const getNotesFeed = query({
    args: {
        squadId: v.id("squads"),
        filter: notesFeedFilterValidator,
        searchText: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Notes", args.paginationOpts);
        const normalizedFilter = args.filter;

        let sourcePage: any[] = [];
        let isDone = true;
        let continueCursor: string | null = args.paginationOpts.cursor;

        if (normalizedFilter === "mine") {
            const mineResult = await ctx.db
                .query("notes")
                .withIndex("by_owner_squad", (q) =>
                    q.eq("ownerId", userId).eq("squadId", args.squadId),
                )
                .order("desc")
                .paginate(args.paginationOpts);
            sourcePage = mineResult.page;
            isDone = mineResult.isDone;
            continueCursor = mineResult.continueCursor;
        } else {
            const overfetchCount = Math.min(Math.max(args.paginationOpts.numItems * 4, 40), SECURITY_LIMITS.query.maxPageSize * 4);
            const broadResult = await ctx.db
                .query("notes")
                .withIndex("by_squad_and_updatedAt", (q) => q.eq("squadId", args.squadId))
                .order("desc")
                .paginate({
                    numItems: overfetchCount,
                    cursor: args.paginationOpts.cursor,
                });
            sourcePage = broadResult.page;
            isDone = broadResult.isDone;
            continueCursor = broadResult.continueCursor;
        }

        const visible = sourcePage.filter((note) => canViewNote(note, userId));

        const filteredByChip = visible.filter((note) => {
            if (normalizedFilter === "pinned") {
                return Boolean(note.pinned);
            }
            return true;
        });

        const filteredBySearch = filteredByChip.filter((note) =>
            matchesSearch(note, args.searchText),
        );

        const ranked = sortFeedNotes(filteredBySearch, normalizedFilter);
        const clipped = ranked.slice(0, args.paginationOpts.numItems);

        const enrichedPage = await Promise.all(
            clipped.map(async (note) => {
                const [{ nickname: ownerNickname, avatarUrl: ownerAvatarUrl }, collaboratorPreview, bookmark] =
                    await Promise.all([
                        enrichUser(ctx, note.ownerId, note.squadId),
                        buildCollaboratorPreview(ctx, note),
                        ctx.db
                            .query("bookmarks")
                            .withIndex("by_user_note", (q) => q.eq("userId", userId).eq("noteId", note._id))
                            .first(),
                    ]);

                return {
                    ...note,
                    ownerNickname,
                    ownerAvatarUrl,
                    isMine: note.ownerId === userId,
                    collaborators: collaboratorPreview.collaborators,
                    collaboratorCount: collaboratorPreview.collaboratorCount,
                    isBookmarked: !!bookmark,
                };
            }),
        );

        return {
            page: enrichedPage,
            isDone,
            continueCursor,
        };
    },
});

export const deleteNote = mutation({
    args: {
        noteId: v.id("notes"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const note = await ctx.db.get(args.noteId);
        if (!note) throw new Error("Note not found");

        if (note.type === "shared") {
            await requireMembership(ctx, note.squadId);
        } else {
            if (note.ownerId !== userId) {
                throw new Error("Unauthorized");
            }
        }

        const collaborators = await ctx.db
            .query("noteCollaborators")
            .withIndex("by_note_and_lastEditedAt", (q) => q.eq("noteId", args.noteId))
            .take(100);
        for (const collaborator of collaborators) {
            await ctx.db.delete(collaborator._id);
        }

        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
            .take(SECURITY_LIMITS.query.maxReactionRead);
        for (const b of bookmarks) await ctx.db.delete(b._id);

        await ctx.db.delete(args.noteId);

        return { success: true };
    },
});

export const getPersonalNotes = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Personal notes", args.paginationOpts);

        // Use compound index so pagination returns correctly-sized pages
        // (no post-filter needed — only the user's own notes for this squad)
        return await ctx.db
            .query("notes")
            .withIndex("by_owner_squad", (q) =>
                q.eq("ownerId", userId).eq("squadId", args.squadId)
            )
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getTodayJournal = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const now = new Date();
        const startOfDay = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
        );

        const notes = await ctx.db
            .query("notes")
            .withIndex("by_owner", (q) => q.eq("ownerId", userId))
            .order("desc")
            .take(50);

        return (
            notes.find(
                (n) =>
                    n.type === "journal" &&
                    n.squadId === args.squadId &&
                    n.createdAt >= startOfDay,
            ) ?? null
        );
    },
});

export const getNote = query({
    args: {
        noteId: v.id("notes"),
    },
    handler: async (ctx, args) => {
        const note = await ctx.db.get(args.noteId);
        if (!note) return null;

        const { userId } = await requireMembership(ctx, note.squadId);

        if (note.type === "personal" || note.type === "journal") {
            if (note.ownerId !== userId) return null;
        }
        if (note.type === "friend") {
            if (note.ownerId !== userId && note.targetUserId !== userId)
                return null;
        }

        // Enrich with last editor nickname
        let lastEditedByNickname: string | null = null;
        if (note.lastEditedBy) {
            const { nickname } = await enrichUser(ctx, note.lastEditedBy, note.squadId);
            lastEditedByNickname = nickname;
        }

        return { ...note, lastEditedByNickname };
    },
});

export const getJournals = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Journals", args.paginationOpts);

        const result = await ctx.db
            .query("notes")
            .withIndex("by_owner_squad_type", (q) =>
                q.eq("ownerId", userId).eq("squadId", args.squadId).eq("type", "journal")
            )
            .order("desc")
            .paginate(args.paginationOpts);

        return result;
    },
});

// Used during journal encryption migration: returns all unencrypted journals the user
// owns across all squads. Bounded to SECURITY_LIMITS.content.maxNotesPerUserPerSquad
// multiplied by a reasonable max squads cap — kept intentionally small.
export const getUnencryptedJournals = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // by_owner returns all notes for the user; we filter to journal type only
        const notes = await ctx.db
            .query("notes")
            .withIndex("by_owner", (q) => q.eq("ownerId", userId))
            .order("desc")
            .take(500); // generous cap — users won't have more than this

        return notes.filter((n) => n.type === "journal" && !n.encrypted);
    },
});

export const getSharedNotes = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Shared notes", args.paginationOpts);

        const result = await ctx.db
            .query("notes")
            .withIndex("by_squad_type", (q) =>
                q.eq("squadId", args.squadId).eq("type", "shared")
            )
            .order("desc")
            .paginate(args.paginationOpts);

        // Enrich with last editor nickname
        const enriched = await Promise.all(
            result.page.map(async (note) => {
                let lastEditedByNickname: string | null = null;
                if (note.lastEditedBy) {
                    const { nickname } = await enrichUser(ctx, note.lastEditedBy, note.squadId);
                    lastEditedByNickname = nickname;
                }
                return { ...note, lastEditedByNickname };
            }),
        );

        return {
            ...result,
            page: enriched,
            isDone: result.isDone,
            continueCursor: result.continueCursor,
        };
    },
});

// Legacy — returns all notes the user can see in a squad (kept for backward compat)
export const getNotes = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = Math.min(Math.max(args.limit ?? 30, 1), SECURITY_LIMITS.query.maxPageSize);

        const { userId } = await requireMembership(ctx, args.squadId);

        let q = ctx.db
            .query("notes")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc");

        if (args.cursor !== undefined) {
            const { cursor } = args;
            q = q.filter((q) => q.lt(q.field("createdAt"), cursor));
        }

        const notes = await q.take(limit);

        const filtered = notes.filter((n) => {
            if (n.type === "shared") return true;

            if (n.type === "personal" || n.type === "journal") {
                return n.ownerId === userId;
            }

            if (n.type === "friend") {
                return n.ownerId === userId || n.targetUserId === userId;
            }

            return false;
        });

        const nextCursor =
            notes.length === limit
                ? notes[notes.length - 1].createdAt
                : null;

        return {
            notes: filtered.reverse(),
            nextCursor,
        };
    },
});
