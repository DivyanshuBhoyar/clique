import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { schedulePushToSquad } from "./push";
import { SECURITY_LIMITS, assertArrayLimit, assertRateLimit } from "./security";
import { requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

async function enrichPoll(ctx: QueryCtx, poll: Doc<"polls">, userId: Id<"users">) {
    const options = await ctx.db
        .query("pollOptions")
        .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
        .take(20);

    const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
        .take(200);

    const voteCount = new Map<Id<"pollOptions">, number>();
    for (const vote of votes) {
        voteCount.set(vote.optionId, (voteCount.get(vote.optionId) || 0) + 1);
    }

    const myVote = votes.find((vote) => vote.userId === userId);

    return {
        ...poll,
        options: options.map((option) => ({
            ...option,
            votes: voteCount.get(option._id) || 0,
        })),
        totalVotes: votes.length,
        myVoteOptionId: myVote?.optionId ?? null,
    };
}

export const createPoll = mutation({
    args: {
        squadId: v.id("squads"),
        question: v.string(),
        options: v.array(v.string()),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["createPoll", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);

        assertNonEmpty("Question", args.question);
        assertLength("Question", args.question, 300);
        assertArrayLimit("Poll options", args.options, SECURITY_LIMITS.content.maxPollOptions);
        for (const opt of args.options) {
            assertNonEmpty("Option", opt);
            assertLength("Option", opt, 100);
        }

        if (args.options.length < 2) {
            throw new Error("At least 2 options required");
        }

        const existingPolls = await ctx.db
            .query("polls")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxPollsPerSquad);
        if (existingPolls.length >= SECURITY_LIMITS.content.maxPollsPerSquad) {
            throw new Error(`A squad can have up to ${SECURITY_LIMITS.content.maxPollsPerSquad} polls`);
        }

        const pollId = await ctx.db.insert("polls", {
            squadId: args.squadId,
            question: args.question.trim(),
            createdBy: userId,
            expiresAt: args.expiresAt,
            createdAt: Date.now(),
        });

        for (const text of args.options) {
            await ctx.db.insert("pollOptions", {
                pollId,
                text: text.trim(),
            });
        }

        await schedulePushToSquad(ctx, {
            squadId: args.squadId,
            excludeUserId: userId,
            title: "Homie Squad",
            body: `${membership.nickname} started a poll`,
            data: { path: `/squad/${args.squadId}/vibes` },
        });

        return pollId;
    },
});

export const votePoll = mutation({
    args: {
        pollId: v.id("polls"),
        optionId: v.id("pollOptions"),
    },
    handler: async (ctx, args) => {
        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found");

        const { userId } = await requireMembership(ctx, poll.squadId);

        await assertRateLimit(ctx, ["pollVote", args.pollId, userId], SECURITY_LIMITS.rate.pollVote);

        const option = await ctx.db.get(args.optionId);
        if (!option || option.pollId !== args.pollId) throw new Error("Invalid poll option");

        if (poll.expiresAt && Date.now() > poll.expiresAt) {
            throw new Error("Poll expired");
        }

        const existing = await ctx.db
            .query("pollVotes")
            .withIndex("by_user_poll", (q) =>
                q.eq("userId", userId).eq("pollId", args.pollId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                optionId: args.optionId,
            });
        } else {
            await ctx.db.insert("pollVotes", {
                pollId: args.pollId,
                optionId: args.optionId,
                userId,
            });
        }

        return { success: true };
    },
});

export const getPolls = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const polls = await ctx.db
            .query("polls")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc")
            .take(20);

        const enriched = [];
        for (const poll of polls) {
            enriched.push(await enrichPoll(ctx, poll, userId));
        }

        return enriched;
    },
});

export const getPastPolls = query({
    args: {
        squadId: v.id("squads"),
        recentCount: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const recentCount = Math.min(Math.max(args.recentCount ?? 5, 0), 20);
        const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

        const polls = await ctx.db
            .query("polls")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .take(recentCount + limit);

        const pastPolls = polls.slice(recentCount);
        const enriched = [];

        for (const poll of pastPolls) {
            enriched.push(await enrichPoll(ctx, poll, userId));
        }

        return enriched;
    },
});
