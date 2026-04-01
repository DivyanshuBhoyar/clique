import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";


export const createMemory = mutation({
    args: {
        squadId: v.id("squads"),
        title: v.string(),
        description: v.optional(v.string()),
        type: v.union(
            v.literal("wall"),
            v.literal("event")
        ),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        if (args.type === "wall" && args.description === undefined) {
            throw new Error("Wall memory should have content");
        }

        return await ctx.db.insert("memories", {
            squadId: args.squadId,
            title: args.title,
            description: args.description,
            type: args.type,
            createdBy: userId,
            createdAt: Date.now(),
        });
    },
});


export const addMemoryItem = mutation({
    args: {
        memoryId: v.id("memories"),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("link")
        ),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");

        if (memory.type !== "event") {
            throw new Error("Cannot add items to non-event memory");
        }

        const { userId } = await requireMembership(
            ctx,
            memory.squadId
        );

        return await ctx.db.insert("memoryItems", {
            memoryId: args.memoryId,
            userId,
            type: args.type,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});


export const getMemoryWithItems = query({
    args: {
        memoryId: v.id("memories"),
    },

    handler: async (ctx, args) => {
        const memory = await ctx.db.get(args.memoryId);
        if (!memory) throw new Error("Memory not found");

        await requireMembership(ctx, memory.squadId);

        const items = await ctx.db
            .query("memoryItems")
            .withIndex("by_memory", (q) =>
                q.eq("memoryId", args.memoryId)
            )
            .order("asc").take(100)

        if (memory.type === "wall") {
            return {
                memory,
                items: []
            };
        }
        return {
            memory,
            items,
        };
    },
});


export const getWallMemories = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;

        await requireMembership(ctx, args.squadId);

        let q = ctx.db
            .query("memories")
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

        const memories = await q.take(limit);

        const wallMemories = memories.filter(
            (m) => m.type === "wall"
        );

        const nextCursor =
            memories.length === limit
                ? memories[memories.length - 1].createdAt
                : null;

        return {
            memories: wallMemories.reverse(),
            nextCursor,
        };
    },
});