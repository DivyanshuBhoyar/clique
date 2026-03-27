import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Get the authenticated user's ID from Convex Auth identity.
 * Looks up (or creates) the app-level user record by tokenIdentifier.
 */
export async function getAuthUserId(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
            q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .unique();

    if (!user) {
        throw new Error("User not found. Please sign in again.");
    }

    return user._id;
}

/**
 * Get or create a user record from Convex Auth identity.
 * Used during sign-in flow to ensure a user record exists.
 */
export async function getOrCreateUser(ctx: MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }

    const existing = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
            q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .unique();

    if (existing) {
        return existing._id;
    }

    // Generate a random avatar using DiceBear for new users
    const randomSeed = Math.random().toString(36).substring(7);
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${randomSeed}`;

    const userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        displayName: identity.name,
        avatarUrl,
        createdAt: Date.now(),
    });

    return userId;
}
