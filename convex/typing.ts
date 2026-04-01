import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const setTyping = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const existing = await ctx.db
            .query("typing")
            .withIndex("by_user_channel", (q) =>
                q.eq("userId", userId)
                    .eq("channelId", args.channelId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                lastTypingAt: now,
            });
        } else {
            await ctx.db.insert("typing", {
                squadId: args.squadId,
                channelId: args.channelId,
                userId,
                lastTypingAt: now,
            });
        }
    },
});


export const getTypingUsers = query({
    args: {
        channelId: v.id("channels"),
    },

    handler: async (ctx, args) => {
        const entries = await ctx.db
            .query("typing")
            .withIndex("by_channel", (q) =>
                q.eq("channelId", args.channelId)
            )
            .collect();

        const now = Date.now();

        return entries
            .filter((e) => now - e.lastTypingAt < 3000) // 3 sec window
            .map((e) => e.userId);
    },
});