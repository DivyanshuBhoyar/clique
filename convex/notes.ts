import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const createNote = mutation({
    args: {
        squadId: v.id("squads"),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("personal"),
            v.literal("shared"),
            v.literal("friend")
        ),
        targetUserId: v.optional(v.id("users")),
        channelId: v.optional(v.id("channels")),
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
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateNote = mutation({
    args: {
        noteId: v.id("notes"),
        title: v.string(),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const note = await ctx.db.get(args.noteId);
        if (!note) throw new Error("Note not found");

        if (note.ownerId !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.noteId, {
            title: args.title,
            content: args.content,
            updatedAt: Date.now(),
        });

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

        if (note.ownerId !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.noteId);

        return { success: true };
    },
});

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
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc");

        if (args.cursor !== undefined) {
            const { cursor } = args;
            q = q.filter((q) =>
                q.lt(q.field("createdAt"), cursor)
            );
        }

        const notes = await q.take(limit);

        const filtered = notes.filter((n) => {
            if (n.type === "shared") return true;

            if (n.type === "personal") {
                return n.ownerId === userId;
            }

            if (n.type === "friend") {
                return (
                    n.ownerId === userId ||
                    n.targetUserId === userId
                );
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