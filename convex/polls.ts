import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const createPoll = mutation({
    args: {
        squadId: v.id("squads"),
        question: v.string(),
        options: v.array(v.string()),
        expiresAt: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        if (args.options.length < 2) {
            throw new Error("At least 2 options required");
        }

        const pollId = await ctx.db.insert("polls", {
            squadId: args.squadId,
            question: args.question,
            createdBy: userId,
            expiresAt: args.expiresAt,
            createdAt: Date.now(),
        });

        // insert options
        for (const text of args.options) {
            await ctx.db.insert("pollOptions", {
                pollId,
                text,
            });
        }

        return pollId;
    },
});


export const votePoll = mutation({
    args: {
        pollId: v.id("polls"),
        optionId: v.id("pollOptions"),
    },

    handler: async (ctx, args) => {
        const userId = (await requireMembership(ctx, (await ctx.db.get(args.pollId))!.squadId)).userId;

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found");

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
        await requireMembership(ctx, args.squadId);

        const polls: Doc<"polls">[] = await ctx.db
            .query("polls")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc")
            .collect();

        const pollIds = polls.map((p) => p._id);

        const options = await ctx.db
            .query("pollOptions")
            .collect();

        const votes = await ctx.db
            .query("pollVotes")
            .collect();

        // group options
        const optionsMap = new Map<Id<"polls">, Doc<"pollOptions">[]>();
        for (const o of options) {
            if (!optionsMap.has(o.pollId)) {
                optionsMap.set(o.pollId, []);
            }
            optionsMap.get(o.pollId)!.push(o);
        }

        const voteCount = new Map<Id<"pollOptions">, number>();
        for (const v of votes) {
            voteCount.set(
                v.optionId,
                (voteCount.get(v.optionId) || 0) + 1
            );
        }

        return polls.map((p) => ({
            ...p,
            options: (optionsMap.get(p._id) || []).map((o) => ({
                ...o,
                votes: voteCount.get(o._id) || 0,
            })),
        }));
    },
});