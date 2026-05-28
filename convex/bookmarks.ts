import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertPaginationLimit } from "./security";
import { requireMembership } from "./users";

export const toggleBookmark = mutation({
    args: {
        targetType: v.union(
            v.literal("message"),
            v.literal("drop"),
            v.literal("note"),
            v.literal("memory"),
        ),
        messageId: v.optional(v.id("messages")),
        dropId: v.optional(v.id("drops")),
        noteId: v.optional(v.id("notes")),
        memoryId: v.optional(v.id("memories")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        // Derive squadId from the target entity
        let squadId: Id<"squads">;
        if (args.messageId) {
            const msg = await ctx.db.get(args.messageId);
            if (!msg) throw new Error("Message not found");
            squadId = msg.squadId;
            const channel = await ctx.db.get(msg.channelId);
            if (channel?.type === "private") {
                const channelMembership = await ctx.db
                    .query("channelMemberships")
                    .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", msg.channelId))
                    .first();
                if (!channelMembership) throw new Error("Not a member of this channel");
            }
        } else if (args.dropId) {
            const drop = await ctx.db.get(args.dropId);
            if (!drop) throw new Error("Drop not found");
            squadId = drop.squadId;
        } else if (args.noteId) {
            const note = await ctx.db.get(args.noteId);
            if (!note) throw new Error("Note not found");
            squadId = note.squadId;
            if (note.type === "personal" || note.type === "journal") {
                if (note.ownerId !== userId) throw new Error("Unauthorized");
            }
            if (note.type === "friend") {
                if (note.ownerId !== userId && note.targetUserId !== userId) throw new Error("Unauthorized");
            }
        } else if (args.memoryId) {
            const memory = await ctx.db.get(args.memoryId);
            if (!memory) throw new Error("Memory not found");
            squadId = memory.squadId;
        } else {
            throw new Error("No target provided");
        }

        await requireMembership(ctx, squadId);

        // Look up existing bookmark
        const indexField = `${args.targetType}Id` as "messageId" | "dropId" | "noteId" | "memoryId";
        const targetId = args[args.targetType + "Id" as keyof typeof args] as Id<"messages"> | Id<"drops"> | Id<"notes"> | Id<"memories"> | undefined;
        if (!targetId) throw new Error("Target ID missing");

        const indexName = `by_user_${args.targetType}` as "by_user_message" | "by_user_drop" | "by_user_note" | "by_user_memory";
        const existing = await ctx.db
            .query("bookmarks")
            .withIndex(indexName, (q) =>
                (q as any).eq("userId", userId).eq(indexField, targetId)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        await ctx.db.insert("bookmarks", {
            userId,
            squadId,
            targetType: args.targetType,
            messageId: args.messageId,
            dropId: args.dropId,
            noteId: args.noteId,
            memoryId: args.memoryId,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});

export const getBookmarks = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Bookmarks", args.paginationOpts);
        // Bookmarks only expose items the user explicitly bookmarked after passing target visibility checks.

        const result = await ctx.db
            .query("bookmarks")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", args.squadId)
            )
            .order("desc")
            .paginate(args.paginationOpts);

        const enriched = await Promise.all(
            result.page.map(async (bookmark) => {
                let content: string | null = null;
                let title: string | null = null;

                if (bookmark.targetType === "message" && bookmark.messageId) {
                    const msg = await ctx.db.get(bookmark.messageId);
                    if (msg) {
                        content = msg.deleted ? "This message was deleted" : msg.content;
                    }
                } else if (bookmark.targetType === "drop" && bookmark.dropId) {
                    const drop = await ctx.db.get(bookmark.dropId);
                    if (drop) {
                        content = drop.content;
                    }
                } else if (bookmark.targetType === "note" && bookmark.noteId) {
                    const note = await ctx.db.get(bookmark.noteId);
                    if (note) {
                        title = note.title;
                        content = note.content;
                    }
                } else if (bookmark.targetType === "memory" && bookmark.memoryId) {
                    const memory = await ctx.db.get(bookmark.memoryId);
                    if (memory) {
                        title = memory.title ?? null;
                        content = memory.content ?? null;
                    }
                }

                const isDeleted = content === null;

                return {
                    _id: bookmark._id,
                    targetType: bookmark.targetType,
                    targetId: bookmark.messageId ?? bookmark.dropId ?? bookmark.noteId ?? bookmark.memoryId,
                    content,
                    title,
                    isDeleted,
                    createdAt: bookmark.createdAt,
                };
            })
        );

        return {
            ...result,
            page: enriched.filter((b) => !b.isDeleted),
        };
    },
});
