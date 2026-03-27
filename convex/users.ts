import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUser } from "./authHelpers";

export const ensureUser = mutation({
    args: {},
    handler: async (ctx) => {
        return await getOrCreateUser(ctx);
    },
});

export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        return await ctx.db.get(userId);
    },
});

export const saveUsername = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id, {
            username: args.username,
        });

        return user._id;
    },
});
