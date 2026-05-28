import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { requireMembership } from "./users";

export const updatePresence = mutation({
    args: {
        squadId: v.id("squads"),
    },

    handler: async (ctx, args) => {
        const { membership: m } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["presence", args.squadId, m.userId], SECURITY_LIMITS.rate.presence);

        await ctx.db.patch(m._id, {
            lastActiveAt: Date.now(),
        });
    },
});

export const getPresence = query({
    args: { squadId: v.id("squads") },

    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);

        const members = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .take(SECURITY_LIMITS.query.maxPresenceRead);

        const now = Date.now();

        return members.map((m) => ({
            userId: m.userId,
            nickname: m.nickname,
            isOnline: now - (m.lastActiveAt ?? 0) < 30000,
        }));
    },
});