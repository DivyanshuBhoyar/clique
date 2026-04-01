import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMembership } from "./users";

export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        await requireMembership(ctx, message.squadId);

        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_user_message", (q) =>
                q.eq("userId", userId).eq("messageId", args.messageId)
            )
            .filter((q) => q.eq(q.field("emoji"), args.emoji))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        await ctx.db.insert("reactions", {
            messageId: args.messageId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});