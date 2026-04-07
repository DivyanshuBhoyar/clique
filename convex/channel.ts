import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const getChannels = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);
        return await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .collect();
    },
});

export const createChannel = mutation({
    args: {
        squadId: v.id("squads"),
        name: v.string(),
        type: v.union(v.literal("topic"), v.literal("mood")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        const channelId = await ctx.db.insert("channels", {
            squadId: args.squadId,
            name: args.name,
            type: args.type,
            createdBy: userId,
            createdAt: Date.now(),
        });

        return channelId;
    },
});