import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSquad = mutation({
    args: {
        name: v.string(),
        password: v.string(),
        userId: v.id("users"),
        nickname: v.string(),
    },

    handler: async (ctx, args) => {
        const now = Date.now();

        const passwordHash = await bcrypt.hash(args.password, 10);

        const squadId = await ctx.db.insert("squads", {
            name: args.name,
            passwordHash,
            createdBy: args.userId,
            createdAt: now,
        });

        await ctx.db.insert("memberships", {
            userId: args.userId,
            squadId,
            nickname: args.nickname,
            joinedAt: now,
        });

        // default channel
        await ctx.db.insert("channels", {
            squadId,
            name: "Lounge",
            type: "main",
            createdBy: args.userId,
            createdAt: now,
        });

        return squadId;
    },
});

export const joinSquad = mutation({
    args: {
        squadId: v.id("squads"),
        password: v.string(),
        userId: v.id("users"),
        nickname: v.string(),
        vibe: v.optional(v.string()),
        statusText: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        const squad = await ctx.db.get(args.squadId);
        if (!squad) throw new Error("Squad not found");

        const valid = await bcrypt.compare(
            args.password,
            squad.passwordHash
        );

        if (!valid) throw new Error("Invalid password");

        const existing = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", args.userId).eq("squadId", args.squadId)
            )
            .first();

        if (existing) return args.squadId;

        await ctx.db.insert("memberships", {
            userId: args.userId,
            squadId: args.squadId,
            nickname: args.nickname,
            vibe: args.vibe,
            statusText: args.statusText,
            joinedAt: Date.now(),
        });

        return args.squadId;
    },
});



export const getUserSquads = query({
    args: {
        userId: v.id("users"),
    },

    handler: async (ctx, args) => {
        // 📥 get memberships
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) =>
                q.eq("userId", args.userId)
            )
            .collect();

        if (memberships.length === 0) {
            return [];
        }

        // 📥 fetch squads (batched)
        const squadIds = memberships.map((m) => m.squadId);

        const squads = await ctx.db
            .query("squads")
            .filter((q) =>
                q.or(
                    ...squadIds.map((id) =>
                        q.eq(q.field("_id"), id)
                    )
                )
            )
            .collect();

        // 🧠 map for fast lookup
        const squadMap = new Map();
        for (const s of squads) {
            squadMap.set(s._id, s);
        }

        // 🔗 merge
        return memberships.map((m) => ({
            squad: squadMap.get(m.squadId) || null,
            membership: m,
        }));
    },
});