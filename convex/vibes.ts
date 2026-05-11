import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";
import { assertLength } from "./validators";

export const setVibe = mutation({
    args: {
        squadId: v.id("squads"),
        emoji: v.string(),
        label: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        assertLength("Emoji", args.emoji, 10);
        if (args.label) assertLength("Label", args.label, 30);

        await ctx.db.patch(membership._id, {
            vibe: args.emoji,
            vibeLabel: args.label,
            vibeUpdatedAt: Date.now(),
        });
    },
});

export const clearVibe = mutation({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const { membership } = await requireMembership(ctx, args.squadId);

        await ctx.db.patch(membership._id, {
            vibe: undefined,
            vibeLabel: undefined,
            vibeUpdatedAt: undefined,
        });
    },
});

export const getSquadVibes = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .collect();

        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        const vibes = [];
        for (const m of memberships) {
            if (!m.vibe || !m.vibeUpdatedAt || (now - m.vibeUpdatedAt) >= twentyFourHours) continue;
            const { avatarUrl } = await enrichUser(ctx, m.userId, args.squadId);
            vibes.push({
                userId: m.userId,
                nickname: m.nickname,
                avatarUrl,
                vibe: m.vibe!,
                vibeLabel: m.vibeLabel ?? null,
                vibeUpdatedAt: m.vibeUpdatedAt!,
                isCurrentUser: m.userId === userId,
            });
        }
        return vibes;
    },
});
