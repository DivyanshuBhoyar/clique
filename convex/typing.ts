import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { requireMembership } from "./users";

export const setTyping = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["typing", args.squadId, args.channelId, userId], SECURITY_LIMITS.rate.typing);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) throw new Error("Invalid channel");
        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!membership) throw new Error("Not a member of this channel");
        }

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
        squadId: v.id("squads"),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) throw new Error("Invalid channel");
        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!membership) return [];
        }

        const entries = await ctx.db
            .query("typing")
            .withIndex("by_channel", (q) =>
                q.eq("channelId", args.channelId)
            )
            .take(SECURITY_LIMITS.query.maxTypingRead);

        const now = Date.now();

        const active = entries.filter((e) => now - e.lastTypingAt < 3000);

        const withNicknames = await Promise.all(
            active.map(async (e) => {
                const membership = await ctx.db
                    .query("memberships")
                    .withIndex("by_user_squad", (q) =>
                        q.eq("userId", e.userId).eq("squadId", args.squadId)
                    )
                    .first();
                return {
                    userId: e.userId,
                    nickname: membership?.nickname ?? "Someone",
                    lastTypingAt: e.lastTypingAt,
                };
            })
        );

        return withNicknames;
    },
});