import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, query } from "./_generated/server";

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