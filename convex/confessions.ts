import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertPaginationLimit, assertRateLimit } from "./security";
import { requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

export const createConfession = mutation({
    args: {
        squadId: v.id("squads"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["createConfession", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);
        assertNonEmpty("Confession", args.content);
        assertLength("Confession", args.content, 1000);

        const existing = await ctx.db
            .query("confessions")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxConfessionsPerSquad);
        if (existing.length >= SECURITY_LIMITS.content.maxConfessionsPerSquad) {
            throw new Error(`A squad can have up to ${SECURITY_LIMITS.content.maxConfessionsPerSquad} confessions`);
        }

        return await ctx.db.insert("confessions", {
            squadId: args.squadId,
            content: args.content.trim(),
            createdAt: Date.now(),
        });
    },
});

export const getConfessions = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Confessions", args.paginationOpts);

        const result = await ctx.db
            .query("confessions")
            .withIndex("by_squad_created", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc")
            .paginate(args.paginationOpts);

        const enriched = [];
        for (const confession of result.page) {
            const reactions = await ctx.db
                .query("confessionReactions")
                .withIndex("by_confession", (q) =>
                    q.eq("confessionId", confession._id)
                )
                .take(SECURITY_LIMITS.query.maxReactionRead);

            const grouped = new Map<string, { emoji: string; count: number; hasReacted: boolean }>();
            for (const r of reactions) {
                const existing = grouped.get(r.emoji);
                if (existing) {
                    existing.count++;
                    if (r.userId === userId) existing.hasReacted = true;
                } else {
                    grouped.set(r.emoji, {
                        emoji: r.emoji,
                        count: 1,
                        hasReacted: r.userId === userId,
                    });
                }
            }

            enriched.push({
                ...confession,
                reactions: Array.from(grouped.values()),
            });
        }

        return {
            ...result,
            page: enriched,
        };
    },
});

export const toggleConfessionReaction = mutation({
    args: {
        confessionId: v.id("confessions"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Emoji", args.emoji, 10);

        const confession = await ctx.db.get(args.confessionId);
        if (!confession) throw new Error("Confession not found");

        await requireMembership(ctx, confession.squadId);

        await assertRateLimit(ctx, ["confessionReaction", args.confessionId, userId], SECURITY_LIMITS.rate.reaction);

        const existing = await ctx.db
            .query("confessionReactions")
            .withIndex("by_user_confession", (q) =>
                q.eq("userId", userId).eq("confessionId", args.confessionId)
            )
            .first();

        if (existing) {
            if (existing.emoji === args.emoji) {
                await ctx.db.delete(existing._id);
                return { action: "removed" };
            }
            await ctx.db.patch(existing._id, { emoji: args.emoji });
            return { action: "updated" };
        }

        await ctx.db.insert("confessionReactions", {
            confessionId: args.confessionId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { action: "added" };
    },
});
