import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./users";

export const sendMessage = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        content: v.string(),
        parentMessageId: v.optional(v.id("messages")),
    },

    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) {
            throw new Error("Invalid channel");
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



export const getMessages = query({
    args: {
        channelId: v.id("channels"),
        paginationOpts: paginationOptsValidator,
    },

    handler: async (ctx, args) => {
        const page = await ctx.db
            .query("messages")
            .withIndex("by_channel", (q) =>
                q.eq("channelId", args.channelId)
            )
            .order("desc")
            .paginate(args.paginationOpts);

        // Enrich the current page with reactions and parent messages
        const ids = page.page.map((m) => m._id);

        const reactions =
            ids.length === 0
                ? []
                : await ctx.db
                    .query("reactions")
                    .filter((q) =>
                        q.or(...ids.map((id) =>
                            q.eq(q.field("messageId"), id)
                        ))
                    )
                    .collect();

        const reactionsMap = new Map();
        reactions.forEach((r) => {
            if (!reactionsMap.has(r.messageId)) {
                reactionsMap.set(r.messageId, []);
            }
            reactionsMap.get(r.messageId).push(r);
        });

        const parentIds = [
            ...new Set(
                page.page.map((m) => m.parentMessageId).filter(Boolean)
            ),
        ];

        const parents =
            parentIds.length === 0
                ? []
                : await ctx.db
                    .query("messages")
                    .filter((q) =>
                        q.or(...parentIds.map((id) =>
                            q.eq(q.field("_id"), id)
                        ))
                    )
                    .collect();

        const parentMap = new Map();
        parents.forEach((p) => parentMap.set(p._id, p));

        const enrichedPage = page.page.map((m) => {
            const isDeleted = m.deleted === true;

            const parent = m.parentMessageId
                ? parentMap.get(m.parentMessageId)
                : null;

            return {
                ...m,
                content: isDeleted ? "This message was deleted" : m.content,
                deleted: isDeleted,

                reactions: reactionsMap.get(m._id) || [],

                parentMessage: parent
                    ? {
                        ...parent,
                        content: parent.deleted ? "This message was deleted" : parent.content,
                        deleted: parent.deleted ?? false,
                    }
                    : null,
            };
        });

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