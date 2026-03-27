import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createChannel = mutation({
    args: {
        squadId: v.id("squads"),
        userId: v.id("users"),
        name: v.string(),
        type: v.union(v.literal("topic"), v.literal("mood")),
    },

    handler: async (ctx, args) => {
        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", args.userId).eq("squadId", args.squadId)
            )
            .first();

        if (!membership) throw new Error("Not a member");

        const channelId = await ctx.db.insert("channels", {
            squadId: args.squadId,
            name: args.name,
            type: args.type,
            createdBy: args.userId,
            createdAt: Date.now(),
        });

        return channelId;
    },
});