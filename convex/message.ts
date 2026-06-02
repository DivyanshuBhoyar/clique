import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { schedulePush } from "./push";
import { SECURITY_LIMITS, assertPaginationLimit, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

type ChatMessageKind = "text" | "image" | "gif";

type ChannelPushRecipient = {
    userId: Id<"users">;
    tokens: string[];
};

function truncateForNotification(value: string, maxLength = 90) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

function previewForChatMessage(kind: ChatMessageKind, nickname: string, content: string) {
    if (kind === "image") return `${nickname} sent a photo`;
    if (kind === "gif") return `${nickname} sent a GIF`;
    return `${nickname}: ${truncateForNotification(content)}`;
}

function extractMentionHandles(content: string) {
    const handles = new Set<string>();
    for (const match of content.matchAll(/@(\w+)/g)) {
        const handle = match[1]?.toLowerCase();
        if (handle) handles.add(handle);
    }
    return handles;
}

async function getMentionedUserIds(
    ctx: MutationCtx,
    squadId: Id<"squads">,
    content: string,
) {
    const handles = extractMentionHandles(content);
    if (handles.size === 0) return new Set<Id<"users">>();

    const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_squad", (q) => q.eq("squadId", squadId))
        .take(SECURITY_LIMITS.query.maxSquadMembersRead);

    return new Set(
        memberships
            .filter((membership) => handles.has(membership.nickname.toLowerCase()))
            .map((membership) => membership.userId),
    );
}

async function scheduleChatMessagePushes(
    ctx: MutationCtx,
    args: {
        squadId: Id<"squads">;
        channelId: Id<"channels">;
        senderId: Id<"users">;
        senderNickname: string;
        kind: ChatMessageKind;
        content: string;
        parentMessageId?: Id<"messages">;
    },
) {
    const recipients: ChannelPushRecipient[] = await ctx.runQuery(internal.push.getRecipientsForChannel, {
        squadId: args.squadId,
        channelId: args.channelId,
        excludeUserId: args.senderId,
    });
    if (recipients.length === 0) return;

    const parentMessage = args.parentMessageId
        ? await ctx.db.get(args.parentMessageId)
        : null;
    const mentionedUserIds = await getMentionedUserIds(ctx, args.squadId, args.content);
    const path = `/squad/${args.squadId}/chat/${args.channelId}`;

    for (const recipient of recipients) {
        let body = previewForChatMessage(args.kind, args.senderNickname, args.content);
        if (parentMessage?.userId === recipient.userId) {
            body = `${args.senderNickname} replied to your message`;
        } else if (mentionedUserIds.has(recipient.userId)) {
            body = `${args.senderNickname} mentioned you`;
        }

        await schedulePush(ctx, {
            tokens: recipient.tokens,
            title: "Homie Squad",
            body,
            data: { path },
        });
    }
}

export const sendMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        content: v.string(),
        parentMessageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["sendMessage", args.squadId, args.channelId, userId], SECURITY_LIMITS.rate.sendMessage);

        assertNonEmpty("Message", args.content);
        assertLength("Message", args.content, 2000);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
        }

        // Private channel membership guard
        if (channel.type === "private") {
            const chMembership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!chMembership) throw new Error("Not a member of this channel");
        }

        // Ephemeral channel expiry guard
        if (channel.type === "ephemeral" && channel.expiresAt && Date.now() > channel.expiresAt) {
            throw new Error("This room has expired");
        }

        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (!parent || parent.channelId !== args.channelId) {
                throw new Error("Invalid parent");
            }
        }

        const messageId = await ctx.db.insert("messages", {
            squadId: args.squadId,
            channelId: args.channelId,
            userId,
            content: args.content.trim(),
            type: "text",
            nickname: membership.nickname,
            parentMessageId: args.parentMessageId,
            createdAt: Date.now(),
        });

        await scheduleChatMessagePushes(ctx, {
            squadId: args.squadId,
            channelId: args.channelId,
            senderId: userId,
            senderNickname: membership.nickname,
            kind: "text",
            content: args.content.trim(),
            parentMessageId: args.parentMessageId,
        });

        return messageId;
    },
});

export const sendImageMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        storageId: v.id("_storage"),
        content: v.optional(v.string()),
        parentMessageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["sendImageMessage", args.squadId, args.channelId, userId], SECURITY_LIMITS.rate.sendImageMessage);

        if (args.content) assertLength("Caption", args.content, 500);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
        }

        // Private channel membership guard
        if (channel.type === "private") {
            const chMembership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!chMembership) throw new Error("Not a member of this channel");
        }

        if (channel.type === "ephemeral" && channel.expiresAt && Date.now() > channel.expiresAt) {
            throw new Error("This room has expired");
        }

        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (!parent || parent.channelId !== args.channelId) {
                throw new Error("Invalid parent");
            }
        }

        const messageId = await ctx.db.insert("messages", {
            squadId: args.squadId,
            channelId: args.channelId,
            userId,
            content: args.content?.trim() ?? "",
            type: "image",
            storageId: args.storageId,
            nickname: membership.nickname,
            parentMessageId: args.parentMessageId,
            createdAt: Date.now(),
        });

        await scheduleChatMessagePushes(ctx, {
            squadId: args.squadId,
            channelId: args.channelId,
            senderId: userId,
            senderNickname: membership.nickname,
            kind: "image",
            content: args.content?.trim() ?? "",
            parentMessageId: args.parentMessageId,
        });

        return messageId;
    },
});

// Allowed GIPHY CDN hostnames — validated server-side to prevent arbitrary URLs
const GIPHY_CDN_HOSTS = [
    "media.giphy.com",
    "media0.giphy.com",
    "media1.giphy.com",
    "media2.giphy.com",
    "media3.giphy.com",
    "media4.giphy.com",
    "i.giphy.com",
];

function assertGiphyUrl(url: string): void {
    let hostname: string;
    try {
        ({ hostname } = new URL(url));
    } catch {
        throw new Error("Invalid GIF URL");
    }
    if (!GIPHY_CDN_HOSTS.includes(hostname)) {
        throw new Error("Invalid GIF URL");
    }
}

export const sendGifMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        gifUrl: v.string(),
        gifPreviewUrl: v.string(),
        gifId: v.string(),
        gifTitle: v.optional(v.string()),
        parentMessageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["sendGifMessage", args.squadId, args.channelId, userId], SECURITY_LIMITS.rate.sendGifMessage);

        assertGiphyUrl(args.gifUrl);
        assertGiphyUrl(args.gifPreviewUrl);
        assertLength("GIF ID", args.gifId, 64);
        if (args.gifTitle) assertLength("GIF title", args.gifTitle, 200);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
        }

        if (channel.type === "private") {
            const chMembership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!chMembership) throw new Error("Not a member of this channel");
        }

        if (channel.type === "ephemeral" && channel.expiresAt && Date.now() > channel.expiresAt) {
            throw new Error("This room has expired");
        }

        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (!parent || parent.channelId !== args.channelId) {
                throw new Error("Invalid parent");
            }
        }

        const messageId = await ctx.db.insert("messages", {
            squadId: args.squadId,
            channelId: args.channelId,
            userId,
            content: "",
            type: "gif",
            gifUrl: args.gifUrl,
            gifPreviewUrl: args.gifPreviewUrl,
            gifId: args.gifId,
            gifTitle: args.gifTitle,
            nickname: membership.nickname,
            parentMessageId: args.parentMessageId,
            createdAt: Date.now(),
        });

        await scheduleChatMessagePushes(ctx, {
            squadId: args.squadId,
            channelId: args.channelId,
            senderId: userId,
            senderNickname: membership.nickname,
            kind: "gif",
            content: args.gifTitle?.trim() ?? "",
            parentMessageId: args.parentMessageId,
        });

        return messageId;
    },
});



export const getMessages = query({
    args: {
        channelId: v.id("channels"),
        paginationOpts: paginationOptsValidator,
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertPaginationLimit("Messages", args.paginationOpts);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");

        await requireMembership(ctx, channel.squadId);

        if (channel.type === "private") {
            const membership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!membership) throw new Error("Not a member of this channel");
        }

        const page = await ctx.db
            .query("messages")
            .withIndex("by_channel", (q) =>
                q.eq("channelId", args.channelId)
            )
            .order("desc")
            .paginate(args.paginationOpts);

        // Enrich the current page with reactions and parent messages
        const ids = page.page.map((m) => m._id);

        const reactionSets = ids.length === 0
            ? []
            : await Promise.all(
                ids.map((id) =>
                    ctx.db
                        .query("reactions")
                        .withIndex("by_message", (q) => q.eq("messageId", id))
                        .take(SECURITY_LIMITS.query.maxReactionRead)
                ),
            );

        const reactionsMap = new Map();
        for (const set of reactionSets) {
            for (const r of set) {
                if (!reactionsMap.has(r.messageId)) {
                    reactionsMap.set(r.messageId, []);
                }
                reactionsMap.get(r.messageId).push(r);
            }
        }

        const parentIds = [
            ...new Set(
                page.page.map((m) => m.parentMessageId).filter((id): id is Id<"messages"> => id !== undefined)
            ),
        ];

        const parentDocs = parentIds.length === 0
            ? []
            : await Promise.all(parentIds.map((id) => ctx.db.get(id)));

        const parents = parentDocs.filter((p): p is NonNullable<typeof p> => p !== null);

        const parentMap = new Map();
        parents.forEach((p) => parentMap.set(p._id, p));

        // Collect unique user+squad pairs for avatar resolution
        const userIds = [...new Set(page.page.map((m) => m.userId))];
        const squadId = page.page[0]?.squadId;

        const avatarMap = new Map<string, string | null>();
        if (squadId) {
            for (const uid of userIds) {
                const { avatarUrl } = await enrichUser(ctx, uid, squadId);
                avatarMap.set(uid, avatarUrl);
            }
        }

        const enrichedPage = await Promise.all(page.page.map(async (m) => {
            const isDeleted = m.deleted === true;

            const parent = m.parentMessageId
                ? parentMap.get(m.parentMessageId)
                : null;

            const imageUrl = m.type === "image" && m.storageId && !isDeleted
                ? await ctx.storage.getUrl(m.storageId)
                : null;

            const gifUrl = m.type === "gif" && !isDeleted ? (m.gifUrl ?? null) : null;
            const gifPreviewUrl = m.type === "gif" && !isDeleted ? (m.gifPreviewUrl ?? null) : null;
            const gifId = m.type === "gif" && !isDeleted ? (m.gifId ?? null) : null;
            const gifTitle = m.type === "gif" && !isDeleted ? (m.gifTitle ?? null) : null;

            const bookmark = userId
                ? await ctx.db
                    .query("bookmarks")
                    .withIndex("by_user_message", (q) => q.eq("userId", userId).eq("messageId", m._id))
                    .first()
                : null;

            return {
                ...m,
                content: isDeleted ? "This message was deleted" : m.content,
                deleted: isDeleted,
                avatarUrl: avatarMap.get(m.userId) ?? null,
                imageUrl,
                gifUrl,
                gifPreviewUrl,
                gifId,
                gifTitle,
                isBookmarked: !!bookmark,

                reactions: reactionsMap.get(m._id) || [],

                parentMessage: parent
                    ? {
                        ...parent,
                        content: parent.deleted ? "This message was deleted" : parent.content,
                        deleted: parent.deleted ?? false,
                    }
                    : null,
            };
        }));

        return {
            ...page,
            page: enrichedPage,
        };
    },
});



export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const message = await ctx.db.get(args.messageId);

        if (!message) {
            throw new Error("Message not found");
        }

        await requireMembership(ctx, message.squadId);

        if (message.userId !== userId) {
            throw new Error("Unauthorized");
        }

        if (message.deleted) {
            return { success: true };
        }

        // Cascade: delete bookmarks pointing to this message
        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .collect();
        for (const b of bookmarks) {
            await ctx.db.delete(b._id);
        }

        await ctx.db.patch(args.messageId, {
            deleted: true,
            content: "",
        });

        return { success: true };
    },
});

export const editMessage = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Message", args.content, 2000);

        const message = await ctx.db.get(args.messageId);

        if (!message) {
            throw new Error("Message not found");
        }

        await requireMembership(ctx, message.squadId);

        if (message.userId !== userId) {
            throw new Error("Unauthorized");
        }

        if (message.deleted) {
            throw new Error("Cannot edit deleted message");
        }

        await ctx.db.patch(args.messageId, {
            content: args.content.trim(),
            editedAt: Date.now(),
        });

        return { success: true };
    },
});