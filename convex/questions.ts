import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

export const createWeeklyQuestion = mutation({
    args: {
        squadId: v.id("squads"),
        question: v.string(),
        channelId: v.optional(v.id("channels")),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["weeklyQuestion", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);
        assertNonEmpty("Question", args.question);
        assertLength("Question", args.question, 300);

        const existingQuestions = await ctx.db
            .query("weeklyQuestions")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad);
        if (existingQuestions.length >= SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad) {
            throw new Error(`A squad can have up to ${SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad} weekly questions`);
        }

        if (args.channelId) {
            const channel = await ctx.db.get(args.channelId);
            if (!channel || channel.squadId !== args.squadId) throw new Error("Invalid channel");
        }

        return await ctx.db.insert("weeklyQuestions", {
            squadId: args.squadId,
            question: args.question.trim(),
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

        await assertRateLimit(ctx, ["weeklyAnswer", question.squadId, userId], SECURITY_LIMITS.rate.contentCreate);
        assertNonEmpty("Answer", args.content);
        assertLength("Answer", args.content, 2000);

        const existing = await ctx.db
            .query("weeklyAnswers")
            .withIndex("by_user_question", (q) =>
                q.eq("userId", userId).eq("questionId", args.questionId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content.trim(),
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("weeklyAnswers", {
            questionId: args.questionId,
            userId,
            content: args.content.trim(),
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
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .take(SECURITY_LIMITS.query.maxQuestionRead);

        return await Promise.all(
            questions.map(async (q) => {
                const answers = await ctx.db
                    .query("weeklyAnswers")
                    .withIndex("by_question", (qa) => qa.eq("questionId", q._id))
                    .take(SECURITY_LIMITS.query.maxAnswerRead);
                return {
                    ...q,
                    answers,
                    myAnswer: answers.find((a) => a.userId === userId) ?? null,
                };
            })
        );
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
                .take(SECURITY_LIMITS.query.maxSquadMembersRead)).length;

            return { question: null, answers: [], myAnswer: null, answerCount: 0, squadMemberCount: memberCount };
        }

        const answers = await ctx.db
            .query("weeklyAnswers")
            .withIndex("by_question", (q) => q.eq("questionId", question._id))
            .take(SECURITY_LIMITS.query.maxAnswerRead);

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
            .take(SECURITY_LIMITS.query.maxSquadMembersRead)).length;

        return {
            question,
            answers: enrichedAnswers,
            myAnswer,
            answerCount: answers.length,
            squadMemberCount: memberCount,
        };
    },
});

export const getPastWeeklyQuestions = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const limit = Math.min(Math.max(args.limit ?? 25, 1), 50);

        const questions = await ctx.db
            .query("weeklyQuestions")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .take(limit + 1);

        const memberCount = (await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(200)).length;

        const pastQuestions = questions.slice(1);
        const entries = [];

        for (const question of pastQuestions) {
            const answers = await ctx.db
                .query("weeklyAnswers")
                .withIndex("by_question", (q) => q.eq("questionId", question._id))
                .take(200);

            const enrichedAnswers = [];
            for (const answer of answers) {
                const { nickname, avatarUrl } = await enrichUser(ctx, answer.userId, args.squadId);
                enrichedAnswers.push({
                    ...answer,
                    nickname,
                    avatarUrl,
                });
            }

            entries.push({
                question,
                answers: enrichedAnswers,
                myAnswer: answers.find((answer) => answer.userId === userId) ?? null,
                answerCount: answers.length,
                squadMemberCount: memberCount,
            });
        }

        return entries;
    },
});
