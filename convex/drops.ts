import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";


export const createDrop = mutation({
    args: {
        squadId: v.id("squads"),
        category: v.string(),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        return await ctx.db.insert("drops", {
            squadId: args.squadId,
            userId,
            category: args.category,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});


export const getDrops = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;

        await requireMembership(ctx, args.squadId);

        let q = ctx.db
            .query("drops")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc");

        if (args.cursor) {
            const { cursor } = args;
            q = q.filter((q) =>
                q.lt(q.field("createdAt"), cursor)
            );
        }

        const drops = await q.take(limit);
        const dropIds = drops.map((d) => d._id);

        let reactions: Doc<"dropReactions">[] = [];

        if (dropIds.length > 0) {
            reactions = await ctx.db
                .query("dropReactions")
                .filter((q) =>
                    q.or(
                        ...dropIds.map((id) =>
                            q.eq(q.field("dropId"), id)
                        )
                    )
                )
                .collect();
        }

        const reactionsMap = new Map<Id<"drops">, Doc<"dropReactions">[]>();

        for (const r of reactions) {
            if (!reactionsMap.has(r.dropId)) {
                reactionsMap.set(r.dropId, []);
            }
            reactionsMap.get(r.dropId)!.push(r);
        }

        // COMMENTS (batched)
        let comments: Doc<"dropComments">[] = [];

        if (dropIds.length > 0) {
            comments = await ctx.db
                .query("dropComments")
                .filter((q) =>
                    q.or(
                        ...dropIds.map((id) =>
                            q.eq(q.field("dropId"), id)
                        )
                    )
                )
                .collect();
        }

        const commentCountMap = new Map<Id<"drops">, number>();

        for (const c of comments) {
            commentCountMap.set(
                c.dropId,
                (commentCountMap.get(c.dropId) || 0) + 1
            );
        }

        // Merge 
        const enriched = drops.map((d) => ({
            ...d,
            reactions: reactionsMap.get(d._id) || [],
            commentCount: commentCountMap.get(d._id) || 0,
        }));

        enriched.reverse();

        return {
            drops: enriched,
            nextCursor:
                drops.length === limit
                    ? (drops[drops.length - 1].createdAt as number | null)
                    : null,
        };
    },
});


export const toggleDropReaction = mutation({
    args: {
        dropId: v.id("drops"),
        emoji: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        await requireMembership(ctx, drop.squadId);

        const existing = await ctx.db
            .query("dropReactions")
            .withIndex("by_user_drop", (q) =>
                q.eq("userId", userId).eq("dropId", args.dropId)
            )
            .filter((q) =>
                q.eq(q.field("emoji"), args.emoji)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        await ctx.db.insert("dropReactions", {
            dropId: args.dropId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});


export const addDropComment = mutation({
    args: {
        dropId: v.id("drops"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        await requireMembership(ctx, drop.squadId);

        return await ctx.db.insert("dropComments", {
            dropId: args.dropId,
            userId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});


export const getDropComments = query({
    args: {
        dropId: v.id("drops"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = args.limit ?? 30;

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        await requireMembership(ctx, drop.squadId);

        let q = ctx.db
            .query("dropComments")
            .withIndex("by_drop", (q) =>
                q.eq("dropId", args.dropId)
            )
            .order("desc");

        if (args.cursor !== undefined) {
            const { cursor } = args;
            q = q.filter((q) =>
                q.lt(q.field("createdAt"), cursor)
            );
        }

        const comments = await q.take(limit);

        const nextCursor =
            comments.length === limit
                ? comments[comments.length - 1].createdAt
                : null;

        return {
            comments: comments.reverse(),
            nextCursor,
        };
    },
});