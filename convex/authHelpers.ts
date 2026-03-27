import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Get the authenticated user's ID from Convex Auth identity.
 * In @convex-dev/auth, the identity.subject is the Id<"users">.
 */
export async function getAuthUserId(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }

    return identity.subject as Id<"users">;
}

/**
 * Get or create a user record from Convex Auth identity.
 * Note: @convex-dev/auth usually handles user creation during sign-in.
 * This helper can be used to ensure custom fields are initialized.
 */
export async function getOrCreateUser(ctx: MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }

    const userId = identity.subject as Id<"users">;
    const existing = await ctx.db.get(userId);

    if (existing) {
        return userId;
    }

    // Generate a random avatar using DiceBear for new users
    const randomSeed = Math.random().toString(36).substring(7);
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${randomSeed}`;

    // Note: We use ctx.db.insert with the fixed ID if possible, 
    // but usually convex-auth has already inserted it.
    // If it hasn't, we insert it.
    await ctx.db.insert("users", {
        email: identity.email,
        avatarUrl,
        createdAt: Date.now(),
    });

    return userId;
}
