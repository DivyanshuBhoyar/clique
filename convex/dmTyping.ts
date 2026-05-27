import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TYPING_STALE_MS = 3000;

export const setDmTyping = mutation({
    args: { conversationId: v.id("dmConversations") },
    handler: async (ctx, { conversationId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        // Verify participant
        const conv = await ctx.db.get(conversationId);
        if (!conv) throw new Error("Not found");
        if (conv.participantA !== userId && conv.participantB !== userId) {
            throw new Error("FORBIDDEN");
        }

        const existing = await ctx.db
            .query("dmTyping")
            .withIndex("by_user_conversation", (q) =>
                q.eq("userId", userId).eq("conversationId", conversationId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { lastTypingAt: Date.now() });
        } else {
            await ctx.db.insert("dmTyping", {
                conversationId,
                userId,
                lastTypingAt: Date.now(),
            });
        }
    },
});

export const getDmTypingUser = query({
    args: { conversationId: v.id("dmConversations") },
    handler: async (ctx, { conversationId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const conv = await ctx.db.get(conversationId);
        if (!conv || (conv.participantA !== userId && conv.participantB !== userId)) {
            return [];
        }

        const entries = await ctx.db
            .query("dmTyping")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", conversationId)
            )
            .take(5);

        const now = Date.now();
        const active = entries.filter(
            (e) => e.userId !== userId && now - e.lastTypingAt < TYPING_STALE_MS
        );

        return Promise.all(active.map(async (entry) => {
            const user = await ctx.db.get(entry.userId);
            return {
                userId: entry.userId,
                nickname: user?.name ?? user?.email ?? "Someone",
                lastTypingAt: entry.lastTypingAt,
            };
        }));
    },
});
