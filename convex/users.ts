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