import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertLength } from "./validators";

/**
 * Toggle a DM reaction.
 *
 * Rules:
 * - Single reaction per user per message (one emoji at a time).
 * - Tapping the same emoji removes it (toggle off).
 * - Tapping a different emoji replaces the existing one.
 */
export const toggle = mutation({
    args: {
        conversationId: v.id("dmConversations"),
        messageId: v.string(),
        emoji: v.string(),
    },
    handler: async (ctx, { conversationId, messageId, emoji }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Emoji", emoji, 10);

        // Verify the user is a participant
        const conv = await ctx.db.get(conversationId);
        if (!conv) throw new Error("Conversation not found");
        if (conv.participantA !== userId && conv.participantB !== userId) {
            throw new Error("FORBIDDEN");
        }

        // Find any existing reaction this user has on this message
        const existing = await ctx.db
            .query("dmReactions")
            .withIndex("by_user_and_message", (q) =>
                q.eq("userId", userId).eq("messageId", messageId)
            )
            .first();

        if (existing) {
            if (existing.emoji === emoji) {
                // Same emoji — toggle off
                await ctx.db.delete(existing._id);
                return { removed: true };
            }
            // Different emoji — replace
            await ctx.db.delete(existing._id);
        }

        await ctx.db.insert("dmReactions", {
            messageId,
            conversationId,
            userId,
            emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});

/**
 * Fetch all reactions for a conversation in one query.
 * Returns flat array; callers group by messageId client-side.
 */
export const forConversation = query({
    args: { conversationId: v.id("dmConversations") },
    handler: async (ctx, { conversationId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const conv = await ctx.db.get(conversationId);
        if (!conv) return [];
        if (conv.participantA !== userId && conv.participantB !== userId) return [];

        return ctx.db
            .query("dmReactions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();
    },
});
