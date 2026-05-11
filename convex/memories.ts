import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";
import { assertLength } from "./validators";


export const createMemory = mutation({
    args: {
        squadId: v.id("squads"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        coverStorageId: v.optional(v.id("_storage")),
        type: v.union(v.literal("wall"), v.literal("event")),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        if (args.title) assertLength("Title", args.title, 100);
        if (args.content) assertLength("Content", args.content, 2000);

        if (args.type === "wall" && !args.content?.trim()) {
            throw new Error("Wall memory requires content");
        }
        if (args.type === "event" && !args.title?.trim()) {
            throw new Error("Event memory requires a title");
        }

        return await ctx.db.insert("memories", {
            squadId: args.squadId,
            title: args.title,
            content: args.content,
            coverStorageId: args.coverStorageId,
            type: args.type,
            createdBy: userId,
            createdAt: Date.now(),
        });
    },
});


export const deleteMemory = mutation({
    args: { memoryId: v.id("memories") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");
        if (memory.createdBy !== userId) throw new Error("Not authorized");

        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_memory", (q) => q.eq("memoryId", args.memoryId))
            .collect();
        for (const b of bookmarks) await ctx.db.delete(b._id);

        await ctx.db.delete(args.memoryId);
    },
});


export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");
        return await ctx.storage.generateUploadUrl();
    },
});


export const getWallMemories = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const result = await ctx.db
            .query("memories")
            .withIndex("by_squad_type", (q) => q.eq("squadId", args.squadId).eq("type", "wall"))
            .order("desc")
            .paginate(args.paginationOpts);

        const page = result.page;

        const enriched = [];
        for (const memory of page) {
            const [reactions, { nickname, avatarUrl }, comments, bookmark] = await Promise.all([
                ctx.db
                    .query("memoryReactions")
                    .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                    .collect(),
                enrichUser(ctx, memory.createdBy, memory.squadId),
                ctx.db
                    .query("memoryComments")
                    .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                    .collect(),
                ctx.db
                    .query("bookmarks")
                    .withIndex("by_user_memory", (q) => q.eq("userId", userId).eq("memoryId", memory._id))
                    .first(),
            ]);

            enriched.push({
                ...memory,
                nickname,
                avatarUrl,
                reactions,
                commentCount: comments.length,
                isBookmarked: !!bookmark,
            });
        }

        return { ...result, page: enriched };
    },
});


export const getEventMemories = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const result = await ctx.db
            .query("memories")
            .withIndex("by_squad_type", (q) => q.eq("squadId", args.squadId).eq("type", "event"))
            .order("desc")
            .paginate(args.paginationOpts);

        const page = result.page;

        const enriched = [];
        for (const memory of page) {
            const [reactions, { nickname, avatarUrl }, items, coverUrl, bookmark] = await Promise.all([
                ctx.db
                    .query("memoryReactions")
                    .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                    .collect(),
                enrichUser(ctx, memory.createdBy, memory.squadId),
                ctx.db
                    .query("memoryItems")
                    .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                    .collect(),
                memory.coverStorageId
                    ? ctx.storage.getUrl(memory.coverStorageId)
                    : Promise.resolve(null),
                ctx.db
                    .query("bookmarks")
                    .withIndex("by_user_memory", (q) => q.eq("userId", userId).eq("memoryId", memory._id))
                    .first(),
            ]);

            enriched.push({
                ...memory,
                coverUrl,
                nickname,
                avatarUrl,
                reactions,
                reflectionCount: items.filter((i) => i.type === "reflection").length,
                photoCount: items.filter((i) => i.type === "photo").length,
                linkCount: items.filter((i) => i.type === "link").length,
                isBookmarked: !!bookmark,
            });
        }

        return { ...result, page: enriched };
    },
});


export const getMemoryDetail = query({
    args: { memoryId: v.id("memories") },
    handler: async (ctx, args) => {
        const memory = await ctx.db.get(args.memoryId);
        if (!memory) return null;

        const { userId } = await requireMembership(ctx, memory.squadId);

        const [reactions, { nickname, avatarUrl }, comments, coverUrl] = await Promise.all([
            ctx.db
                .query("memoryReactions")
                .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                .collect(),
            enrichUser(ctx, memory.createdBy, memory.squadId),
            memory.type === "wall"
                ? ctx.db
                    .query("memoryComments")
                    .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
                    .order("asc")
                    .collect()
                : Promise.resolve([]),
            memory.coverStorageId
                ? ctx.storage.getUrl(memory.coverStorageId)
                : Promise.resolve(null),
        ]);

        const enrichedComments = [];
        for (const comment of comments) {
            const { nickname: commentNickname, avatarUrl: commentAvatarUrl } = await enrichUser(ctx, comment.userId, memory.squadId);
            enrichedComments.push({
                ...comment,
                nickname: commentNickname,
                avatarUrl: commentAvatarUrl,
            });
        }

        const items = memory.type === "event"
            ? await ctx.db
                .query("memoryItems")
                .withIndex("by_memory", (q) => q.eq("memoryId", args.memoryId))
                .order("asc")
                .collect()
            : [];

        const enrichedItems = [];
        for (const item of items) {
            const [itemUser, itemReactions, itemComments, photoUrl] = await Promise.all([
                enrichUser(ctx, item.userId, memory.squadId),
                ctx.db
                    .query("memoryItemReactions")
                    .withIndex("by_item", (q) => q.eq("itemId", item._id))
                    .collect(),
                ctx.db
                    .query("memoryItemComments")
                    .withIndex("by_item", (q) => q.eq("itemId", item._id))
                    .collect(),
                item.storageId
                    ? ctx.storage.getUrl(item.storageId)
                    : Promise.resolve(null),
            ]);

            enrichedItems.push({
                ...item,
                photoUrl,
                nickname: itemUser.nickname,
                avatarUrl: itemUser.avatarUrl,
                reactions: itemReactions,
                commentCount: itemComments.length,
            });
        }

        return {
            memory,
            coverUrl,
            nickname,
            avatarUrl,
            reactions,
            comments: enrichedComments,
            items: enrichedItems,
            isOwner: memory.createdBy === userId,
        };
    },
});


export const toggleMemoryReaction = mutation({
    args: {
        memoryId: v.id("memories"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        const existing = await ctx.db
            .query("memoryReactions")
            .withIndex("by_user_memory", (q) =>
                q.eq("userId", userId).eq("memoryId", args.memoryId)
            )
            .first();

        if (existing?.emoji === args.emoji) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        if (existing) {
            await ctx.db.patch(existing._id, { emoji: args.emoji });
            return { updated: true };
        }

        await ctx.db.insert("memoryReactions", {
            memoryId: args.memoryId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});


export const toggleMemoryItemReaction = mutation({
    args: {
        itemId: v.id("memoryItems"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Item not found");

        const memory = await ctx.db.get(item.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        const existing = await ctx.db
            .query("memoryItemReactions")
            .withIndex("by_user_item", (q) =>
                q.eq("userId", userId).eq("itemId", args.itemId)
            )
            .first();

        if (existing?.emoji === args.emoji) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        if (existing) {
            await ctx.db.patch(existing._id, { emoji: args.emoji });
            return { updated: true };
        }

        await ctx.db.insert("memoryItemReactions", {
            itemId: args.itemId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});


export const addMemoryItem = mutation({
    args: {
        memoryId: v.id("memories"),
        type: v.union(v.literal("reflection"), v.literal("photo"), v.literal("link")),
        content: v.string(),
        caption: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");
        if (memory.type !== "event") throw new Error("Cannot add items to wall memories");

        const { userId } = await requireMembership(ctx, memory.squadId);

        assertLength("Content", args.content, 1000);
        if (args.caption) assertLength("Caption", args.caption, 200);

        return await ctx.db.insert("memoryItems", {
            memoryId: args.memoryId,
            userId,
            type: args.type,
            content: args.content,
            caption: args.caption,
            storageId: args.storageId,
            createdAt: Date.now(),
        });
    },
});


export const addMemoryComment = mutation({
    args: {
        memoryId: v.id("memories"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        assertLength("Comment", args.content, 500);

        return await ctx.db.insert("memoryComments", {
            memoryId: args.memoryId,
            userId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});


export const addMemoryItemComment = mutation({
    args: {
        itemId: v.id("memoryItems"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Item not found");

        const memory = await ctx.db.get(item.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        assertLength("Comment", args.content, 500);

        return await ctx.db.insert("memoryItemComments", {
            itemId: args.itemId,
            userId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});


export const getMemoryComments = query({
    args: {
        memoryId: v.id("memories"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        const result = await ctx.db
            .query("memoryComments")
            .withIndex("by_memory", (q) => q.eq("memoryId", args.memoryId))
            .order("asc")
            .paginate(args.paginationOpts);

        const enriched = [];
        for (const comment of result.page) {
            const { nickname, avatarUrl } = await enrichUser(ctx, comment.userId, memory.squadId);

            enriched.push({
                ...comment,
                nickname,
                avatarUrl,
            });
        }

        return { ...result, page: enriched };
    },
});


export const getMemoryItemComments = query({
    args: {
        itemId: v.id("memoryItems"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Item not found");

        const memory = await ctx.db.get(item.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        const result = await ctx.db
            .query("memoryItemComments")
            .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
            .order("asc")
            .paginate(args.paginationOpts);

        const enriched = [];
        for (const comment of result.page) {
            const { nickname, avatarUrl } = await enrichUser(ctx, comment.userId, memory.squadId);

            enriched.push({
                ...comment,
                nickname,
                avatarUrl,
            });
        }

        return { ...result, page: enriched };
    },
});

export const deleteMemoryItem = mutation({
    args: { itemId: v.id("memoryItems") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Item not found");
        if (item.userId !== userId) throw new Error("Unauthorized");

        // Cascade: item reactions
        const reactions = await ctx.db
            .query("memoryItemReactions")
            .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
            .collect();
        for (const r of reactions) await ctx.db.delete(r._id);

        // Cascade: item comments
        const comments = await ctx.db
            .query("memoryItemComments")
            .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
            .collect();
        for (const c of comments) await ctx.db.delete(c._id);

        await ctx.db.delete(args.itemId);
        return { success: true };
    },
});

