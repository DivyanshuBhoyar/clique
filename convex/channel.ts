import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";
import { assertLength } from "./validators";

const UNREAD_COUNT_LIMIT = 100;
const UNREAD_CHANNEL_LIMIT = 50;

function isExpiredEphemeral(channel: { type: string; expiresAt?: number }) {
    return channel.type === "ephemeral" && channel.expiresAt
        ? Date.now() > channel.expiresAt
        : false;
}

function getMessagePreview(message: { type: string; content: string; deleted?: boolean }) {
    if (message.deleted) return "This message was deleted";
    if (message.type === "image") return message.content ? `📷 ${message.content}` : "📷 Photo";
    if (message.type === "system") return message.content;
    return message.content;
}

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

export const getOtherChannelUnreadSummary = query({
    args: {
        squadId: v.id("squads"),
        excludeChannelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const channels = await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(UNREAD_CHANNEL_LIMIT);

        const visibleChannels = channels.filter(
            (channel) => channel._id !== args.excludeChannelId && !isExpiredEphemeral(channel)
        );

        const readPairs = await Promise.all(
            visibleChannels.map(async (channel) => {
                const readStatus = await ctx.db
                    .query("channelReadStatus")
                    .withIndex("by_user_channel", (q) =>
                        q.eq("userId", userId).eq("channelId", channel._id)
                    )
                    .first();

                return [channel._id, readStatus?.lastReadAt ?? 0] as const;
            })
        );

        const readMap = new Map(readPairs);

        const summaries = await Promise.all(
            visibleChannels
                .map(async (channel) => {
                    const lastReadAt = readMap.get(channel._id) ?? 0;
                    const unreadMessages = await ctx.db
                        .query("messages")
                        .withIndex("by_channel", (q) =>
                            q.eq("channelId", channel._id).gt("createdAt", lastReadAt)
                        )
                        .order("desc")
                        .take(UNREAD_COUNT_LIMIT);

                    const latestMessage = unreadMessages[0];
                    if (!latestMessage) return null;

                    const { avatarUrl } = await enrichUser(ctx, latestMessage.userId, args.squadId);

                    return {
                        channelId: channel._id,
                        channelName: channel.name,
                        channelType: channel.type,
                        unreadCount: unreadMessages.length,
                        hasMoreUnread: unreadMessages.length === UNREAD_COUNT_LIMIT,
                        lastMessageAt: latestMessage.createdAt,
                        lastMessagePreview: getMessagePreview(latestMessage),
                        lastMessageNickname: latestMessage.nickname ?? "Someone",
                        lastMessageAvatarUrl: avatarUrl,
                    };
                })
        );

        const channelsWithUnread = summaries
            .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt);

        return {
            activeChannelId: args.excludeChannelId,
            totalUnread: channelsWithUnread.reduce((total, channel) => total + channel.unreadCount, 0),
            channels: channelsWithUnread,
        };
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

        assertLength("Channel name", args.name, 50);

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

export const getChannelReadReceipts = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel) return [];

        const { userId } = await requireMembership(ctx, channel.squadId);

        const statuses = await ctx.db
            .query("channelReadStatus")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .take(50);

        const visibleStatuses = statuses.filter((status) => status.userId !== userId);

        return await Promise.all(
            visibleStatuses.map(async (status) => {
                const { nickname, avatarUrl } = await enrichUser(ctx, status.userId, channel.squadId);
                return {
                    userId: status.userId,
                    nickname,
                    avatarUrl,
                    lastReadAt: status.lastReadAt,
                };
            })
        );
    },
});
