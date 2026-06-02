import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { schedulePushToUser } from "./push";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { requireMembership } from "./users";
import { assertLength } from "./validators";

export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Emoji", args.emoji, 10);

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        const { membership } = await requireMembership(ctx, message.squadId);

        const channel = await ctx.db.get(message.channelId);
        if (channel?.type === "private") {
            const channelMembership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", message.channelId))
                .first();
            if (!channelMembership) throw new Error("Not a member of this channel");
        }

        await assertRateLimit(ctx, ["messageReaction", args.messageId, userId], SECURITY_LIMITS.rate.reaction);

        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_user_message_emoji", (q) =>
                q.eq("userId", userId).eq("messageId", args.messageId).eq("emoji", args.emoji)
            )
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

        await schedulePushToUser(ctx, {
            userId: message.userId,
            excludeUserId: userId,
            suppressIfActiveChannelId: message.channelId,
            title: "Homie Squad",
            body: `${membership.nickname} reacted ${args.emoji} to your message`,
            data: { path: `/squad/${message.squadId}/chat/${message.channelId}` },
        });

        return { added: true };
    },
});