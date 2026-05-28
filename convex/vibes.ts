import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
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

        await assertRateLimit(ctx, ["setVibe", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);

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
            .take(SECURITY_LIMITS.query.maxSquadMembersRead);

        const vibes = [];
        for (const m of memberships) {
            if (!m.vibe) continue;
            const { avatarUrl } = await enrichUser(ctx, m.userId, args.squadId);
            vibes.push({
                userId: m.userId,
                nickname: m.nickname,
                avatarUrl,
                vibe: m.vibe!,
                vibeLabel: m.vibeLabel ?? null,
                vibeUpdatedAt: m.vibeUpdatedAt ?? m.joinedAt,
                isCurrentUser: m.userId === userId,
            });
        }

        return vibes.sort((a, b) => {
            if (a.isCurrentUser) return -1;
            if (b.isCurrentUser) return 1;
            return b.vibeUpdatedAt - a.vibeUpdatedAt;
        });
    },
});
