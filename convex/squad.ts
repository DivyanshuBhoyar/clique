import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

import { getAuthUserId } from "@convex-dev/auth/server";

const encode = (str: string) => new TextEncoder().encode(str);
const decode = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey("raw", encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const buffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 50000, hash: "SHA-256" }, keyMaterial, 256);
    return `${decode(salt)}:${decode(buffer)}`;
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
    const [saltHex, hashHex] = hash.split(":");
    if (!saltHex || !hashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const keyMaterial = await crypto.subtle.importKey("raw", encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const buffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 50000, hash: "SHA-256" }, keyMaterial, 256);
    return decode(buffer) === hashHex;
}

export const createSquad = mutation({
    args: {
        name: v.string(),
        password: v.string(),
        nickname: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");
        const now = Date.now();

        const passwordHash = await hashPassword(args.password);

        const squadId = await ctx.db.insert("squads", {
            name: args.name,
            passwordHash,
            createdBy: userId,
            createdAt: now,
        });

        await ctx.db.insert("memberships", {
            userId,
            squadId,
            nickname: args.nickname,
            joinedAt: now,
        });

        await ctx.db.insert("channels", {
            squadId,
            name: "Lounge",
            type: "main",
            createdBy: userId,
            createdAt: now,
        });

        return squadId;
    },
});

export const joinSquad = mutation({
    args: {
        squadName: v.string(),
        password: v.string(),
        nickname: v.string(),
        vibe: v.optional(v.string()),
        statusText: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const squad = await ctx.db
            .query("squads")
            .withIndex("by_name", (q) => q.eq("name", args.squadName))
            .first();

        if (!squad) throw new Error("Squad not found");

        const squadId = squad._id;

        const valid = await comparePassword(
            args.password,
            squad.passwordHash
        );

        if (!valid) throw new Error("Invalid password");

        const existing = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", squadId)
            )
            .first();

        if (existing) return squadId;

        await ctx.db.insert("memberships", {
            userId,
            squadId: squadId,
            nickname: args.nickname,
            vibe: args.vibe,
            statusText: args.statusText,
            joinedAt: Date.now(),
        });

        return squadId;
    },
});

export const getUserSquads = query({
    args: {},
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        if (memberships.length === 0) {
            return [];
        }

        const squadIds = memberships.map((m) => m.squadId);

        const squads = await Promise.all(
            squadIds.map((id) => ctx.db.get(id))
        );

        const squadMap = new Map();
        for (const s of squads) {
            if (s) squadMap.set(s._id, s);
        }

        return memberships.map((m) => ({
            squad: squadMap.get(m.squadId) || null,
            membership: m,
        }));
    },
});


export const getCurrentUserSquads = query({
    args: {},

    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        const user = await getCurrentUser(ctx)

        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) =>
                q.eq("userId", user._id)
            )
            .collect();

        const squadIds = memberships.map((m) => m.squadId);

        const squads = await ctx.db
            .query("squads")
            .filter((q) =>
                q.or(...squadIds.map((id) =>
                    q.eq(q.field("_id"), id)
                ))
            )
            .collect();

        const squadMap = new Map();
        squads.forEach((s) => squadMap.set(s._id, s));

        return memberships.map((m) => ({
            squad: squadMap.get(m.squadId) || null,
            membership: m,
        }));
    },
});

export const getSquad = query({
    args: { id: v.id("squads") },
    handler: async (ctx, args) => {
        const squad = await ctx.db.get(args.id);
        return squad;
    },
});

export const leaveSquad = mutation({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", args.squadId)
            )
            .first();

        if (membership) await ctx.db.delete(membership._id);
    },
});
