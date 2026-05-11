import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";
import { assertLength } from "./validators";

export const createQuote = mutation({
    args: {
        squadId: v.id("squads"),
        content: v.string(),
        messageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        assertLength("Quote", args.content, 500);

        if (args.messageId) {
            const message = await ctx.db.get(args.messageId);

            if (!message || message.squadId !== args.squadId) {
                throw new Error("Invalid message reference");
            }
        }

        return await ctx.db.insert("quotes", {
            squadId: args.squadId,
            content: args.content,
            createdBy: userId,
            messageId: args.messageId,
            createdAt: Date.now(),
        });
    },
});

export const getQuotes = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const limit = args.limit ?? 30;
        await requireMembership(ctx, args.squadId);

        let q = ctx.db
            .query("quotes")
            .withIndex("by_squad_created", (q) =>
                args.cursor !== undefined
                    ? q.eq("squadId", args.squadId).lt("createdAt", args.cursor)
                    : q.eq("squadId", args.squadId)
            )
            .order("desc");

        const quotes: Doc<"quotes">[] = await q.take(limit);

        const messageIds: Id<"messages">[] = quotes
            .map((q) => q.messageId)
            .filter((id): id is Id<"messages"> => id !== undefined);

        let messages: Doc<"messages">[] = [];
        if (messageIds.length > 0) {
            messages = await ctx.db
                .query("messages")
                .filter((q) =>
                    q.or(
                        ...messageIds.map((id) =>
                            q.eq(q.field("_id"), id)
                        )
                    )
                )
                .collect();
        }

        const messageMap = new Map<Id<"messages">, Doc<"messages">>();
        for (const m of messages) {
            messageMap.set(m._id, m);
        }

        const enriched = quotes.map((q) => ({
            ...q,
            message: q.messageId
                ? messageMap.get(q.messageId) || null
                : null,
        }));

        enriched.reverse();

        const nextCursor: number | null =
            quotes.length === limit
                ? quotes[quotes.length - 1].createdAt
                : null;

        return {
            quotes: enriched,
            nextCursor,
        };
    },
});

export const deleteQuote = mutation({
    args: {
        quoteId: v.id("quotes"),
    },

    handler: async (ctx, args) => {
        const quote = await ctx.db.get(args.quoteId);
        if (!quote) throw new Error("Quote not found");

        const { userId } = await requireMembership(ctx, quote.squadId);

        if (quote.createdBy !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.quoteId);

        return { success: true };
    },
});