import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { schedulePushToSquad, schedulePushToUser } from "./push";
import { SECURITY_LIMITS, assertPaginationLimit, assertRateLimit } from "./security";
import { enrichUser, requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

const GIPHY_CDN_HOSTS = [
    "media.giphy.com", "media0.giphy.com", "media1.giphy.com",
    "media2.giphy.com", "media3.giphy.com", "media4.giphy.com", "i.giphy.com",
];

function validateGiphyUrl(url: string): void {
    let hostname: string;
    try { ({ hostname } = new URL(url)); } catch { throw new Error("Invalid GIF URL"); }
    if (!GIPHY_CDN_HOSTS.includes(hostname)) throw new Error("Invalid GIF URL");
}

export const createDrop = mutation({
    args: {
        squadId: v.id("squads"),
        category: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId, membership } = await requireMembership(ctx, args.squadId);

        await assertRateLimit(ctx, ["createDrop", args.squadId, userId], SECURITY_LIMITS.rate.contentCreate);

        assertNonEmpty("Content", args.content);
        assertNonEmpty("Category", args.category);
        assertLength("Content", args.content, 2000);
        assertLength("Category", args.category, 50);

        const existingDrops = await ctx.db
            .query("drops")
            .withIndex("by_user_squad", (q) => q.eq("userId", userId).eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.content.maxDropsPerUserPerSquad);
        if (existingDrops.length >= SECURITY_LIMITS.content.maxDropsPerUserPerSquad) {
            throw new Error(`You can create up to ${SECURITY_LIMITS.content.maxDropsPerUserPerSquad} drops in one squad`);
        }

        const dropId = await ctx.db.insert("drops", {
            squadId: args.squadId,
            userId,
            category: args.category.trim(),
            content: args.content.trim(),
            createdAt: Date.now(),
        });

        await schedulePushToSquad(ctx, {
            squadId: args.squadId,
            excludeUserId: userId,
            title: "Homie Squad",
            body: `${membership.nickname} dropped a ${args.category.trim()}`,
            data: { path: `/squad/${args.squadId}/drops` },
        });

        return dropId;
    },
});

export const getDrops = query({
    args: {
        squadId: v.id("squads"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        assertPaginationLimit("Drops", args.paginationOpts);

        const result = await ctx.db
            .query("drops")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .order("desc")
            .paginate(args.paginationOpts);

        const enriched = [];
        for (const drop of result.page) {
            const [reactions, comments, { nickname, avatarUrl }, votes, bookmark] = await Promise.all([
                ctx.db
                    .query("dropReactions")
                    .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                    .take(SECURITY_LIMITS.query.maxReactionRead),
                ctx.db
                    .query("dropComments")
                    .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                    .take(SECURITY_LIMITS.content.maxCommentsPerDrop),
                enrichUser(ctx, drop.userId, drop.squadId),
                ctx.db
                    .query("dropVotes")
                    .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                    .take(SECURITY_LIMITS.query.maxVoteRead),
                ctx.db
                    .query("bookmarks")
                    .withIndex("by_user_drop", (q) => q.eq("userId", userId).eq("dropId", drop._id))
                    .first(),
            ]);

            const upvotes = votes.filter((v) => v.value === "up").length;
            const downvotes = votes.filter((v) => v.value === "down").length;
            const userVote = votes.find((v) => v.userId === userId)?.value ?? null;

            enriched.push({
                ...drop,
                nickname,
                avatarUrl,
                reactions,
                commentCount: comments.length,
                upvotes,
                downvotes,
                userVote,
                isBookmarked: !!bookmark,
            });
        }

        return {
            ...result,
            page: enriched,
        };
    },
});

export const getDrop = query({
    args: {
        dropId: v.id("drops"),
    },
    handler: async (ctx, args) => {
        const drop = await ctx.db.get(args.dropId);
        if (!drop) return null;

        const { userId } = await requireMembership(ctx, drop.squadId);

        const [reactions, comments, { nickname, avatarUrl }, votes, bookmark] = await Promise.all([
            ctx.db
                .query("dropReactions")
                .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                .take(SECURITY_LIMITS.query.maxReactionRead),
            ctx.db
                .query("dropComments")
                .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                .take(SECURITY_LIMITS.content.maxCommentsPerDrop),
            enrichUser(ctx, drop.userId, drop.squadId),
            ctx.db
                .query("dropVotes")
                .withIndex("by_drop", (q) => q.eq("dropId", drop._id))
                .take(SECURITY_LIMITS.query.maxVoteRead),
            ctx.db
                .query("bookmarks")
                .withIndex("by_user_drop", (q) => q.eq("userId", userId).eq("dropId", drop._id))
                .first(),
        ]);

        const upvotes = votes.filter((v) => v.value === "up").length;
        const downvotes = votes.filter((v) => v.value === "down").length;
        const userVote = votes.find((v) => v.userId === userId)?.value ?? null;

        return {
            ...drop,
            nickname,
            avatarUrl,
            reactions,
            commentCount: comments.length,
            upvotes,
            downvotes,
            userVote,
            isBookmarked: !!bookmark,
        };
    },
});

export const toggleDropReaction = mutation({
    args: {
        dropId: v.id("drops"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        const { membership } = await requireMembership(ctx, drop.squadId);

        await assertRateLimit(ctx, ["dropReaction", args.dropId, userId], SECURITY_LIMITS.rate.reaction);
        assertLength("Emoji", args.emoji, 10);

        const existing = await ctx.db
            .query("dropReactions")
            .withIndex("by_user_drop_and_emoji", (q) =>
                q.eq("userId", userId).eq("dropId", args.dropId).eq("emoji", args.emoji)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing!._id);
            return { removed: true };
        }

        await ctx.db.insert("dropReactions", {
            dropId: args.dropId,
            userId,
            emoji: args.emoji,
            createdAt: Date.now(),
        });

        await schedulePushToUser(ctx, {
            userId: drop.userId,
            excludeUserId: userId,
            title: "Homie Squad",
            body: `${membership.nickname} reacted ${args.emoji} to your drop`,
            data: { path: `/squad/${drop.squadId}/drops/${args.dropId}` },
        });

        return { added: true };
    },
});

export const addDropComment = mutation({
    args: {
        dropId: v.id("drops"),
        content: v.string(),
        gifUrl: v.optional(v.string()),
        gifPreviewUrl: v.optional(v.string()),
        gifId: v.optional(v.string()),
        gifTitle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        const { membership } = await requireMembership(ctx, drop.squadId);

        await assertRateLimit(ctx, ["dropComment", args.dropId, userId], SECURITY_LIMITS.rate.comment);
        assertLength("Comment", args.content, 500);

        // Must have content or a GIF
        if (!args.content.trim() && !args.gifUrl) {
            throw new Error("Comment must have content or a GIF");
        }

        if (args.gifUrl) validateGiphyUrl(args.gifUrl);
        if (args.gifPreviewUrl) validateGiphyUrl(args.gifPreviewUrl);
        if (args.gifId) assertLength("GIF ID", args.gifId, 64);
        if (args.gifTitle) assertLength("GIF title", args.gifTitle, 200);

        const comments = await ctx.db
            .query("dropComments")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .take(SECURITY_LIMITS.content.maxCommentsPerDrop);
        if (comments.length >= SECURITY_LIMITS.content.maxCommentsPerDrop) {
            throw new Error("This drop has reached the comment limit");
        }

        const commentId = await ctx.db.insert("dropComments", {
            dropId: args.dropId,
            userId,
            content: args.content.trim(),
            gifUrl: args.gifUrl,
            gifPreviewUrl: args.gifPreviewUrl,
            gifId: args.gifId,
            gifTitle: args.gifTitle,
            createdAt: Date.now(),
        });

        await schedulePushToUser(ctx, {
            userId: drop.userId,
            excludeUserId: userId,
            title: "Homie Squad",
            body: `${membership.nickname} commented on your drop`,
            data: { path: `/squad/${drop.squadId}/drops/${args.dropId}` },
        });

        return commentId;
    },
});

export const getDropComments = query({
    args: {
        dropId: v.id("drops"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        const { userId } = await requireMembership(ctx, drop.squadId);
        assertPaginationLimit("Drop comments", args.paginationOpts);

        const result = await ctx.db
            .query("dropComments")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .order("asc")
            .paginate(args.paginationOpts);

        const enriched = [];
        for (const comment of result.page) {
            const [{ nickname, avatarUrl }, votes] = await Promise.all([
                enrichUser(ctx, comment.userId, drop.squadId),
                ctx.db
                    .query("commentVotes")
                    .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
                    .take(SECURITY_LIMITS.query.maxVoteRead),
            ]);

            const upvotes = votes.filter((v) => v.value === "up").length;
            const downvotes = votes.filter((v) => v.value === "down").length;
            const userVote = votes.find((v) => v.userId === userId)?.value ?? null;

            enriched.push({
                ...comment,
                nickname,
                avatarUrl,
                upvotes,
                downvotes,
                userVote,
            });
        }

        return {
            ...result,
            page: enriched,
        };
    },
});

export const toggleDropVote = mutation({
    args: {
        dropId: v.id("drops"),
        value: v.union(v.literal("up"), v.literal("down")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");

        await requireMembership(ctx, drop.squadId);

        await assertRateLimit(ctx, ["dropVote", args.dropId, userId], SECURITY_LIMITS.rate.pollVote);

        const existing = await ctx.db
            .query("dropVotes")
            .withIndex("by_user_drop", (q) =>
                q.eq("userId", userId).eq("dropId", args.dropId)
            )
            .first();

        if (!existing) {
            await ctx.db.insert("dropVotes", {
                dropId: args.dropId,
                userId,
                value: args.value,
                createdAt: Date.now(),
            });
            return { action: "added" };
        }

        if (existing.value === args.value) {
            await ctx.db.delete(existing._id);
            return { action: "removed" };
        }

        await ctx.db.patch(existing._id, { value: args.value });
        return { action: "flipped" };
    },
});

export const toggleCommentVote = mutation({
    args: {
        commentId: v.id("dropComments"),
        value: v.union(v.literal("up"), v.literal("down")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const comment = await ctx.db.get(args.commentId);
        if (!comment) throw new Error("Comment not found");

        const drop = await ctx.db.get(comment.dropId);
        if (!drop) throw new Error("Drop not found");

        await requireMembership(ctx, drop.squadId);

        await assertRateLimit(ctx, ["commentVote", args.commentId, userId], SECURITY_LIMITS.rate.pollVote);

        const existing = await ctx.db
            .query("commentVotes")
            .withIndex("by_user_comment", (q) =>
                q.eq("userId", userId).eq("commentId", args.commentId)
            )
            .first();

        if (!existing) {
            await ctx.db.insert("commentVotes", {
                commentId: args.commentId,
                userId,
                value: args.value,
                createdAt: Date.now(),
            });
            return { action: "added" };
        }

        if (existing.value === args.value) {
            await ctx.db.delete(existing._id);
            return { action: "removed" };
        }

        await ctx.db.patch(existing._id, { value: args.value });
        return { action: "flipped" };
    },
});

export const deleteDrop = mutation({
    args: { dropId: v.id("drops") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const drop = await ctx.db.get(args.dropId);
        if (!drop) throw new Error("Drop not found");
        if (drop.userId !== userId) throw new Error("Unauthorized");

        // Cascade: reactions
        const reactions = await ctx.db
            .query("dropReactions")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .take(SECURITY_LIMITS.query.maxReactionRead);
        for (const r of reactions) await ctx.db.delete(r._id);

        // Cascade: votes
        const votes = await ctx.db
            .query("dropVotes")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .take(SECURITY_LIMITS.query.maxVoteRead);
        for (const v of votes) await ctx.db.delete(v._id);

        // Cascade: comments (and their votes)
        const comments = await ctx.db
            .query("dropComments")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .take(SECURITY_LIMITS.content.maxCommentsPerDrop);
        for (const comment of comments) {
            const commentVotes = await ctx.db
                .query("commentVotes")
                .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
                .take(SECURITY_LIMITS.query.maxVoteRead);
            for (const cv of commentVotes) await ctx.db.delete(cv._id);
            await ctx.db.delete(comment._id);
        }

        // Cascade: bookmarks
        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_drop", (q) => q.eq("dropId", args.dropId))
            .take(SECURITY_LIMITS.query.maxReactionRead);
        for (const b of bookmarks) await ctx.db.delete(b._id);

        await ctx.db.delete(args.dropId);
        return { success: true };
    },
});

export const deleteDropComment = mutation({
    args: { commentId: v.id("dropComments") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const comment = await ctx.db.get(args.commentId);
        if (!comment) throw new Error("Comment not found");
        if (comment.userId !== userId) throw new Error("Unauthorized");

        // Cascade: comment votes
        const votes = await ctx.db
            .query("commentVotes")
            .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
            .take(SECURITY_LIMITS.query.maxVoteRead);
        for (const v of votes) await ctx.db.delete(v._id);

        await ctx.db.delete(args.commentId);
        return { success: true };
    },
});
