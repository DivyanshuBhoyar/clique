import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { schedulePushToSquad } from "./push";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Ctx = QueryCtx | MutationCtx;

/**
 * Computes whether a new question can be posted for the given squad.
 * Gate opens when more than half the squad has answered OR 7 days have passed.
 * Also returns the raw (unenriched) answers and member count for reuse by callers.
 */
async function getQuestionGate(ctx: Ctx, squadId: Id<"squads">) {
    const [current] = await ctx.db
        .query("weeklyQuestions")
        .withIndex("by_squad", (q) => q.eq("squadId", squadId))
        .order("desc")
        .take(1);

    const members = await ctx.db
        .query("memberships")
        .withIndex("by_squad", (q) => q.eq("squadId", squadId))
        .take(SECURITY_LIMITS.query.maxSquadMembersRead);
    const squadMemberCount = members.length;

    if (!current) {
        return { canPost: true, current: null, rawAnswers: [], answerCount: 0, squadMemberCount };
    }

    const rawAnswers = await ctx.db
        .query("weeklyAnswers")
        .withIndex("by_question", (q) => q.eq("questionId", current._id))
        .take(SECURITY_LIMITS.query.maxAnswerRead);

    const answerCount = rawAnswers.length;
    const majorityAnswered = squadMemberCount > 0 && answerCount > squadMemberCount / 2;
    const weekPassed = Date.now() - current.createdAt >= WEEK_MS;

    return {
        canPost: majorityAnswered || weekPassed,
        current,
        rawAnswers,
        answerCount,
        squadMemberCount,
    };
}

export const createWeeklyQuestion = mutation({
    args: {
        squadId: v.id("squads"),
        question: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["weeklyQuestion", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);
        assertNonEmpty("Question", args.question);
        assertLength("Question", args.question, 300);

        const gate = await getQuestionGate(ctx, args.squadId);
        if (!gate.canPost) {
            throw new Error(
                "New question unlocks once more than half the squad has answered, or after a week."
            );
        }

        const existingQuestions = await ctx.db
            .query("weeklyQuestions")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad);
        if (existingQuestions.length >= SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad) {
            throw new Error(`A squad can have up to ${SECURITY_LIMITS.content.maxWeeklyQuestionsPerSquad} weekly questions`);
        }

        const questionId = await ctx.db.insert("weeklyQuestions", {
            squadId: args.squadId,
            question: args.question.trim(),
            createdBy: userId,
            createdAt: Date.now(),
        });

        await schedulePushToSquad(ctx, {
            squadId: args.squadId,
            excludeUserId: userId,
            title: "Clique",
            body: "Weekly question is here ❓",
            data: { path: `/squad/${args.squadId}/vibes` },
        });

        return questionId;
    },
});

export const updateWeeklyQuestion = mutation({
    args: {
        questionId: v.id("weeklyQuestions"),
        question: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.questionId);
        if (!existing) throw new Error("Question not found");
        await requireMembership(ctx, existing.squadId);

        assertNonEmpty("Question", args.question);
        assertLength("Question", args.question, 300);

        await ctx.db.patch(args.questionId, { question: args.question.trim() });
    },
});

export const deleteWeeklyQuestion = mutation({
    args: {
        questionId: v.id("weeklyQuestions"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.questionId);
        if (!existing) throw new Error("Question not found");
        await requireMembership(ctx, existing.squadId);

        // Cascade: remove all answers for this question
        const answers = await ctx.db
            .query("weeklyAnswers")
            .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
            .take(SECURITY_LIMITS.query.maxAnswerRead);
        for (const answer of answers) {
            await ctx.db.delete(answer._id);
        }

        await ctx.db.delete(args.questionId);
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

        const { userId } = await requireMembership(ctx, question.squadId);

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

export const deleteWeeklyAnswer = mutation({
    args: {
        answerId: v.id("weeklyAnswers"),
    },
    handler: async (ctx, args) => {
        const answer = await ctx.db.get(args.answerId);
        if (!answer) throw new Error("Answer not found");

        const question = await ctx.db.get(answer.questionId);
        if (!question) throw new Error("Question not found");

        const { userId } = await requireMembership(ctx, question.squadId);
        if (answer.userId !== userId) throw new Error("You can only delete your own answer");

        await ctx.db.delete(args.answerId);
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

        const gate = await getQuestionGate(ctx, args.squadId);

        if (!gate.current) {
            return {
                question: null,
                answers: [],
                myAnswer: null,
                answerCount: 0,
                squadMemberCount: gate.squadMemberCount,
                canPostNew: true,
            };
        }

        // Enrich answers with user info (gate already fetched raw answers, enrich them here)
        const enrichedAnswers = [];
        for (const a of gate.rawAnswers) {
            const { nickname, avatarUrl } = await enrichUser(ctx, a.userId, args.squadId);
            enrichedAnswers.push({ ...a, nickname, avatarUrl });
        }

        const asker = gate.current.createdBy
            ? await enrichUser(ctx, gate.current.createdBy, args.squadId)
            : null;

        return {
            question: { ...gate.current, askerNickname: asker?.nickname ?? null },
            answers: enrichedAnswers,
            myAnswer: gate.rawAnswers.find((a) => a.userId === userId) ?? null,
            answerCount: gate.answerCount,
            squadMemberCount: gate.squadMemberCount,
            canPostNew: gate.canPost,
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
