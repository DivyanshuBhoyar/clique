import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";
import { assertLength } from "./validators";

export const sendMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        content: v.string(),
        parentMessageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        assertLength("Message", args.content, 2000);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
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

        return await ctx.db.insert("messages", {
            squadId: args.squadId,
            channelId: args.channelId,
            userId,
            content: args.content,
            type: "text",
            nickname: membership.nickname,
            parentMessageId: args.parentMessageId,
            createdAt: Date.now(),
        });
    },
});

export const sendImageMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        storageId: v.id("_storage"),
        content: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        if (args.content) assertLength("Caption", args.content, 500);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
        }

        if (channel.type === "ephemeral" && channel.expiresAt && Date.now() > channel.expiresAt) {
            throw new Error("This room has expired");
        }

        return await ctx.db.insert("messages", {
            squadId: args.squadId,
            channelId: args.channelId,
            userId,
            content: args.content ?? "",
            type: "image",
            storageId: args.storageId,
            nickname: membership.nickname,
            createdAt: Date.now(),
        });
    },
});



export const getMessages = query({
    args: {
        channelId: v.id("channels"),
        paginationOpts: paginationOptsValidator,
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

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
                        .collect()
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

        if (message.userId !== userId) {
            throw new Error("Unauthorized");
        }

        if (message.deleted) {
            throw new Error("Cannot edit deleted message");
        }

        await ctx.db.patch(args.messageId, {
            content: args.content,
            editedAt: Date.now(),
        });

        return { success: true };
    },
});