import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updatePresence = mutation({
    args: {
        squadId: v.id("squads"),
        userId: v.id("users"),
    },

    handler: async (ctx, args) => {
        const m = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", args.userId).eq("squadId", args.squadId)
            )
            .first();

        if (!m) return;

        await ctx.db.patch(m._id, {
            lastActiveAt: Date.now(),
        });
    },
});

export const getPresence = query({
    args: { squadId: v.id("squads") },

    handler: async (ctx, args) => {
        const members = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .collect();

        const now = Date.now();

        return members.map((m) => ({
            userId: m.userId,
            nickname: m.nickname,
            isOnline: now - (m.lastActiveAt ?? 0) < 30000,
        }));
    },
});