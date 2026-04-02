import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const createConfession = mutation({
    args: {
        squadId: v.id("squads"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);

        return await ctx.db.insert("confessions", {
            squadId: args.squadId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
})

export const getConfessions = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;

        await requireMembership(ctx, args.squadId);

        let q = ctx.db
            .query("confessions")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc");

        if (args.cursor !== undefined) {
            const cursor = args.cursor;
            q = q.filter((q) =>
                q.lt(q.field("createdAt"), cursor)
            );
        }

        const confessions = await q.take(limit);

        const nextCursor =
            confessions.length === limit
                ? confessions[confessions.length - 1].createdAt
                : null;

        return {
            confessions: confessions.reverse(),
            nextCursor,
        };
    },
});