import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";


export const current = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        return await ctx.db.get("users", userId);
    },
});

export const currentAvatarUrl = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        return await getAvatarUrl(ctx, userId);
    },
});

type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: Ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
        throw new Error("Unauthenticated");
    }
    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("Unauthenticated");
    return user;
}



export async function requireMembership(
    ctx: Ctx,
    squadId: Id<"squads">
) {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
        throw new Error("Unauthenticated");
    }

    const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user_squad", (q) =>
            q.eq("userId", userId).eq("squadId", squadId)
        )
        .first();

    if (!membership) {
        throw new Error("Not a member of this squad");
    }

    return {
        userId,
        membership,
    };
}

export const saveUsername = mutation({
    args: {
        username: v.string(),
        image: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        await ctx.db.patch(user._id, {
            name: args.username,
            ...(args.image ? { image: args.image } : {})
        });
    }
});

export const updateAvatar = mutation({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        const existing = await ctx.db
            .query("userAvatars")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, { storageId: args.storageId });
        } else {
            await ctx.db.insert("userAvatars", {
                userId: user._id,
                storageId: args.storageId,
            });
        }
    },
});

export const removeAvatar = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        const existing = await ctx.db
            .query("userAvatars")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export async function getAvatarUrl(ctx: QueryCtx, userId: Id<"users">): Promise<string | null> {
    const [avatar, user] = await Promise.all([
        ctx.db
            .query("userAvatars")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first(),
        ctx.db.get(userId),
    ]);
    if (avatar) {
        return await ctx.storage.getUrl(avatar.storageId);
    }
    return user?.image ?? null;
}

export async function enrichUser(
    ctx: QueryCtx,
    userId: Id<"users">,
    squadId: Id<"squads">
): Promise<{ nickname: string; avatarUrl: string | null }> {
    const [membership, avatarUrl] = await Promise.all([
        ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", squadId)
            )
            .first(),
        getAvatarUrl(ctx, userId),
    ]);
    return {
        nickname: membership?.nickname ?? "Unknown",
        avatarUrl,
    };
}