import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertArrayLimit, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

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
        const { userId } = await requireMembership(ctx, args.squadId);
        const channels = await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.query.maxChannelList);

        // Filter out private channels the user isn't a member of
        const visible = [];
        for (const channel of channels) {
            if (channel.type === "private") {
                const membership = await ctx.db
                    .query("channelMemberships")
                    .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", channel._id))
                    .first();
                if (!membership) continue;
            }
            visible.push(channel);
        }
        return visible;
    },
});

export const getChannelsWithUnread = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        const channels = await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.query.maxChannelList);

        // Filter out private channels the user isn't a member of
        const visibleChannels = [];
        for (const channel of channels) {
            if (channel.type === "private") {
                const chMembership = await ctx.db
                    .query("channelMemberships")
                    .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", channel._id))
                    .first();
                if (!chMembership) continue;
            }
            visibleChannels.push(channel);
        }

        // Batch fetch read statuses for all channels
        const readStatuses = await ctx.db
            .query("channelReadStatus")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.query.maxChannelList);

        const readMap = new Map(readStatuses.map(r => [r.channelId, r.lastReadAt]));

        const enriched = await Promise.all(
            visibleChannels.map(async (channel) => {
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
        emoji: v.optional(v.string()),
        type: v.union(
            v.literal("topic"),
            v.literal("mood"),
            v.literal("thread"),
            v.literal("ephemeral"),
            v.literal("private"),
        ),
        parentChannelId: v.optional(v.id("channels")),
        expiresAt: v.optional(v.number()),
        memberIds: v.optional(v.array(v.id("users"))),
    },

    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["createChannel", args.squadId, userId], SECURITY_LIMITS.rate.createChannel);

        assertNonEmpty("Channel name", args.name);
        assertLength("Channel name", args.name, 50);
        if (args.emoji) assertLength("Emoji", args.emoji, 10);
        assertArrayLimit("Private channel members", args.memberIds ?? [], SECURITY_LIMITS.squads.maxPrivateChannelMembers - 1);

        const existingChannels = await ctx.db
            .query("channels")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.squads.maxChannels);
        if (existingChannels.length >= SECURITY_LIMITS.squads.maxChannels) {
            throw new Error(`A squad can have up to ${SECURITY_LIMITS.squads.maxChannels} channels`);
        }

        if (args.parentChannelId) {
            const parent = await ctx.db.get(args.parentChannelId);
            if (!parent || parent.squadId !== args.squadId) throw new Error("Invalid parent channel");
        }

        // Auto-calculate grace period for ephemeral channels (10% of duration, min 5 min)
        let gracePeriodMs;
        if (args.type === "ephemeral" && args.expiresAt) {
            const duration = args.expiresAt - Date.now();
            if (duration < 5 * 60 * 1000 || duration > 14 * 24 * 60 * 60 * 1000) {
                throw new Error("Ephemeral channels must last between 5 minutes and 14 days");
            }
            gracePeriodMs = Math.max(Math.floor(duration * 0.1), 5 * 60 * 1000);
        }

        const channelId = await ctx.db.insert("channels", {
            squadId: args.squadId,
            name: args.name.trim(),
            emoji: args.emoji,
            type: args.type,
            parentChannelId: args.parentChannelId,
            expiresAt: args.expiresAt,
            gracePeriodMs,
            createdBy: userId,
            createdAt: Date.now(),
        });

        // For private channels, create membership rows for the creator + selected members
        if (args.type === "private") {
            const memberSet = new Set(args.memberIds ?? []);
            memberSet.add(userId); // Creator is always a member
            if (memberSet.size > SECURITY_LIMITS.squads.maxPrivateChannelMembers) {
                throw new Error(`Private channels can include up to ${SECURITY_LIMITS.squads.maxPrivateChannelMembers} members`);
            }
            for (const memberId of memberSet) {
                const squadMembership = await ctx.db
                    .query("memberships")
                    .withIndex("by_user_squad", (q) => q.eq("userId", memberId).eq("squadId", args.squadId))
                    .first();
                if (!squadMembership) throw new Error("Private channel members must belong to the squad");

                await ctx.db.insert("channelMemberships", {
                    channelId,
                    userId: memberId,
                    addedAt: Date.now(),
                });
            }
        }

        return channelId;
    },
});

export const updateChannelMembers = mutation({
    args: {
        channelId: v.id("channels"),
        addIds: v.array(v.id("users")),
        removeIds: v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");
        if (channel.type !== "private") throw new Error("Not a private channel");
        if (channel.createdBy !== userId) throw new Error("Only the channel creator can manage members");

        await assertRateLimit(ctx, ["channelMembers", args.channelId, userId], SECURITY_LIMITS.rate.channelMembershipUpdate);
        assertArrayLimit("Members to add", args.addIds, SECURITY_LIMITS.squads.maxPrivateChannelMembers);
        assertArrayLimit("Members to remove", args.removeIds, SECURITY_LIMITS.squads.maxPrivateChannelMembers);

        const existingMembers = await ctx.db
            .query("channelMemberships")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .take(SECURITY_LIMITS.squads.maxPrivateChannelMembers);
        const nextMembers = new Set(existingMembers.map((member) => member.userId));
        for (const removeId of args.removeIds) nextMembers.delete(removeId);
        for (const addId of args.addIds) nextMembers.add(addId);
        nextMembers.add(channel.createdBy);
        if (nextMembers.size > SECURITY_LIMITS.squads.maxPrivateChannelMembers) {
            throw new Error(`Private channels can include up to ${SECURITY_LIMITS.squads.maxPrivateChannelMembers} members`);
        }

        // Add new members
        for (const addId of args.addIds) {
            const squadMembership = await ctx.db
                .query("memberships")
                .withIndex("by_user_squad", (q) => q.eq("userId", addId).eq("squadId", channel.squadId))
                .first();
            if (!squadMembership) throw new Error("Private channel members must belong to the squad");

            const existing = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", addId).eq("channelId", args.channelId))
                .first();
            if (!existing) {
                await ctx.db.insert("channelMemberships", {
                    channelId: args.channelId,
                    userId: addId,
                    addedAt: Date.now(),
                });

                // Send a system welcome message
                const { nickname } = await enrichUser(ctx, addId, channel.squadId);
                await ctx.db.insert("messages", {
                    channelId: args.channelId,
                    squadId: channel.squadId,
                    userId,
                    content: `${nickname} was added to the channel`,
                    type: "system",
                    createdAt: Date.now(),
                });
            }
        }

        // Remove members (but never remove the creator)
        for (const removeId of args.removeIds) {
            if (removeId === userId) continue; // Creator cannot be removed
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", removeId).eq("channelId", args.channelId))
                .first();
            if (membership) {
                await ctx.db.delete(membership._id);
            }
        }
    },
});

export const renameChannel = mutation({
    args: {
        channelId: v.id("channels"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");
        if (channel.createdBy !== userId) throw new Error("Only the channel creator can rename");

        assertNonEmpty("Channel name", args.name);
        assertLength("Channel name", args.name, 50);
        await ctx.db.patch(args.channelId, { name: args.name.trim() });
    },
});

export const getChannelMembers = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const channel = await ctx.db.get(args.channelId);
        if (!channel) return [];

        await requireMembership(ctx, channel.squadId);
        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!membership) return [];
        }

        const memberships = await ctx.db
            .query("channelMemberships")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .take(SECURITY_LIMITS.squads.maxPrivateChannelMembers);

        return await Promise.all(
            memberships.map(async (m) => {
                const { nickname, avatarUrl } = await enrichUser(ctx, m.userId, channel.squadId);
                return {
                    userId: m.userId,
                    nickname,
                    avatarUrl,
                    addedAt: m.addedAt,
                    isCreator: m.userId === channel.createdBy,
                };
            })
        );
    },
});

export const getChannelExpiry = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.type !== "ephemeral") {
            return null;
        }

        await requireMembership(ctx, channel.squadId);

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

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");
        const { userId: memberUserId } = await requireMembership(ctx, channel.squadId);
        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", memberUserId).eq("channelId", args.channelId))
                .first();
            if (!membership) throw new Error("Not a member of this channel");
        }

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
        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!membership) return [];
        }

        const statuses = await ctx.db
            .query("channelReadStatus")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .take(SECURITY_LIMITS.query.maxSquadMembersRead);

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
