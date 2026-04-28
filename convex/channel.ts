import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const getChannels = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);
        return await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .collect();
    },
});

export const getChannelsWithUnread = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const channels = await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .collect();

        // Batch fetch read statuses for all channels
        const readStatuses = await ctx.db
            .query("channelReadStatus")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const readMap = new Map(readStatuses.map(r => [r.channelId, r.lastReadAt]));

        const enriched = await Promise.all(
            channels.map(async (channel) => {
                const lastReadAt = readMap.get(channel._id) ?? 0;

                // Count unread messages
                const unreadMessages = await ctx.db
                    .query("messages")
                    .withIndex("by_channel", (q) =>
                        q.eq("channelId", channel._id).gt("createdAt", lastReadAt)
                    )
                    .order("desc")
                    .take(100);

                // Fetch recent messages for preview (3 for main, 1 for others)
                const recentMessages = (await ctx.db
                    .query("messages")
                    .withIndex("by_channel", (q) =>
                        q.eq("channelId", channel._id)
                    )
                    .order("desc")
                    .take(channel.type === "main" ? 3 : 1))
                    .reverse()
                    .map(m => ({
                        content: m.deleted ? "This message was deleted" : m.content,
                        createdAt: m.createdAt,
                        nickname: m.nickname ?? "Unknown",
                    }));

                return {
                    ...channel,
                    unreadCount: unreadMessages.length,
                    recentMessages,
                    // Ephemeral channel enrichment
                    isExpired: channel.type === "ephemeral" && channel.expiresAt
                        ? Date.now() > channel.expiresAt
                        : false,
                };
            })
        );

        return enriched;
    },
});

export const createChannel = mutation({
    args: {
        squadId: v.id("squads"),
        name: v.string(),
        type: v.union(
            v.literal("topic"),
            v.literal("mood"),
            v.literal("thread"),
            v.literal("ephemeral"),
        ),
        parentChannelId: v.optional(v.id("channels")),
        expiresAt: v.optional(v.number()),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        // Auto-calculate grace period for ephemeral channels (10% of duration, min 5 min)
        let gracePeriodMs;
        if (args.type === "ephemeral" && args.expiresAt) {
            const duration = args.expiresAt - Date.now();
            gracePeriodMs = Math.max(Math.floor(duration * 0.1), 5 * 60 * 1000);
        }

        const channelId = await ctx.db.insert("channels", {
            squadId: args.squadId,
            name: args.name,
            type: args.type,
            parentChannelId: args.parentChannelId,
            expiresAt: args.expiresAt,
            gracePeriodMs,
            createdBy: userId,
            createdAt: Date.now(),
        });

        return channelId;
    },
});

export const getChannelExpiry = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.type !== "ephemeral") {
            return null;
        }

        const now = Date.now();
        const isExpired = channel.expiresAt ? now > channel.expiresAt : false;
        const isGracePeriodOver = channel.expiresAt && channel.gracePeriodMs
            ? now > channel.expiresAt + channel.gracePeriodMs
            : false;

        return {
            expiresAt: channel.expiresAt ?? null,
            gracePeriodMs: channel.gracePeriodMs ?? null,
            isExpired,
            isGracePeriodOver,
            deleteAt: channel.expiresAt && channel.gracePeriodMs
                ? channel.expiresAt + channel.gracePeriodMs
                : null,
        };
    },
});

export const markChannelRead = mutation({
    args: {
        channelId: v.id("channels"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const existing = await ctx.db
            .query("channelReadStatus")
            .withIndex("by_user_channel", (q) =>
                q.eq("userId", userId).eq("channelId", args.channelId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, { lastReadAt: now });
        } else {
            await ctx.db.insert("channelReadStatus", {
                userId,
                channelId: args.channelId,
                lastReadAt: now,
            });
        }
    },
});
