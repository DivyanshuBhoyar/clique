import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";

export const createWeeklyQuestion = mutation({
    args: {
        squadId: v.id("squads"),
        question: v.string(),
        channelId: v.optional(v.id("channels")),
    },

    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);

        return await ctx.db.insert("weeklyQuestions", {
            squadId: args.squadId,
            question: args.question,
            channelId: args.channelId,
            createdAt: Date.now(),
        });
    },
});

export const answerWeeklyQuestion = mutation({
    args: {
        questionId: v.id("weeklyQuestions"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const question = await ctx.db.get(args.questionId);
        if (!question) throw new Error("Not found");

        const { userId } = await requireMembership(
            ctx,
            question.squadId
        );

        const existing = await ctx.db
            .query("weeklyAnswers")
            .withIndex("by_user_question", (q) =>
                q.eq("userId", userId).eq("questionId", args.questionId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("weeklyAnswers", {
            questionId: args.questionId,
            userId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});

export const getWeeklyQuestions = query({
    args: {
        squadId: v.id("squads"),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const questions = await ctx.db
            .query("weeklyQuestions")
            .withIndex("by_squad", (q) =>
                q.eq("squadId", args.squadId)
            )
            .order("desc")
            .collect();

        const answers = await ctx.db
            .query("weeklyAnswers")
            .collect();

        const answerMap = new Map();

        for (const a of answers) {
            if (!answerMap.has(a.questionId)) {
                answerMap.set(a.questionId, []);
            }
            answerMap.get(a.questionId).push(a);
        }

        return questions.map((q) => ({
            ...q,
            answers: answerMap.get(q._id) || [],
            myAnswer: (answerMap.get(q._id) || []).find(
                (a: any) => a.userId === userId
            ),
        }));
    },
});

export const getCurrentQuestion = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const [question] = await ctx.db
            .query("weeklyQuestions")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .take(1);

        if (!question) {
            const memberCount = (await ctx.db
                .query("memberships")
                .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
                .collect()).length;

            return { question: null, answers: [], myAnswer: null, answerCount: 0, squadMemberCount: memberCount };
        }

        const answers = await ctx.db
            .query("weeklyAnswers")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .collect();

        const enrichedAnswers = [];
        for (const a of answers) {
            const { nickname, avatarUrl } = await enrichUser(ctx, a.userId, args.squadId);

            enrichedAnswers.push({
                ...a,
                nickname,
                avatarUrl,
            });
        }

        const myAnswer = answers.find((a) => a.userId === userId) ?? null;
        const memberCount = (await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .collect()).length;

        return {
            question,
            answers: enrichedAnswers,
            myAnswer,
            answerCount: answers.length,
            squadMemberCount: memberCount,
        };
    },
});