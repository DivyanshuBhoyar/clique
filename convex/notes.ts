import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";

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
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        if (args.type === "friend" && !args.targetUserId) {
            throw new Error("targetUserId required for friend note");
        }

        return await ctx.db.insert("notes", {
            squadId: args.squadId,
            title: args.title,
            content: args.content,
            type: args.type,
            ownerId: userId,
            targetUserId: args.targetUserId,
            channelId: args.channelId,
            tag: args.tag,
            pinned: args.pinned,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateNote = mutation({
    args: {
        noteId: v.id("notes"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        tag: v.optional(v.string()),
        pinned: v.optional(v.boolean()),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const note = await ctx.db.get(args.noteId);
        if (!note) throw new Error("Note not found");

        if (note.type !== "shared" && note.ownerId !== userId) {
            throw new Error("Unauthorized");
        }

        const updates: Record<string, unknown> = {
            updatedAt: Date.now(),
            lastEditedBy: userId,
        };
        if (args.title !== undefined) updates.title = args.title;
        if (args.content !== undefined) updates.content = args.content;
        if (args.tag !== undefined) updates.tag = args.tag;
        if (args.pinned !== undefined) updates.pinned = args.pinned;

        await ctx.db.patch(args.noteId, updates);

        return { success: true };
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

        const result = await ctx.db
            .query("notes")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .paginate(args.paginationOpts);

        const filtered = result.page.filter(
            (n) =>
                n.ownerId === userId &&
                (n.type === "personal" || n.type === "journal"),
        );

        return {
            ...result,
            page: filtered,
        };
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

        const result = await ctx.db
            .query("notes")
            .withIndex("by_owner", (q) => q.eq("ownerId", userId))
            .order("desc")
            .paginate(args.paginationOpts);

        const journals = result.page.filter(
            (n) => n.type === "journal" && n.squadId === args.squadId,
        );

        return {
            ...result,
            page: journals,
        };
    },
});

export const getSharedNotes = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);

        const result = await ctx.db
            .query("notes")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .paginate(args.paginationOpts);

        const shared = result.page.filter((n) => n.type === "shared");

        // Enrich with last editor nickname
        const enriched = await Promise.all(
            shared.map(async (note) => {
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
        const limit = args.limit ?? 30;

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
