import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        userId: v.id("users"),
        emoji: v.string(),
    },

    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_user_message", (q) =>
                q.eq("userId", args.userId).eq("messageId", args.messageId)
            )
            .filter((q) => q.eq(q.field("emoji"), args.emoji))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        }

        await ctx.db.insert("reactions", {
            messageId: args.messageId,
            userId: args.userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        return { added: true };
    },
});