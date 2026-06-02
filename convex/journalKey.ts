import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getJournalKeyConfig = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("journalKeyConfig")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique();
    },
});

export const saveJournalKeyConfig = mutation({
    args: {
        salt: v.string(),
        verificationCt: v.string(),
        verificationNonce: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const existing = await ctx.db
            .query("journalKeyConfig")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                salt: args.salt,
                verificationCt: args.verificationCt,
                verificationNonce: args.verificationNonce,
            });
        } else {
            await ctx.db.insert("journalKeyConfig", {
                userId,
                salt: args.salt,
                verificationCt: args.verificationCt,
                verificationNonce: args.verificationNonce,
            });
        }
    },
});
