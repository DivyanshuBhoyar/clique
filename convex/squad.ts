import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { schedulePushToSquad } from "./push";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

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
        avatarStorageId: v.optional(v.id("_storage")),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["createSquad", userId], SECURITY_LIMITS.rate.createSquad);

        assertNonEmpty("Name", args.name);
        assertLength("Name", args.name, 50);
        assertNonEmpty("Password", args.password);
        assertLength("Password", args.password, 100);
        assertNonEmpty("Nickname", args.nickname);
        assertLength("Nickname", args.nickname, 30);

        const existingMemberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.squads.maxPerUser);
        if (existingMemberships.length >= SECURITY_LIMITS.squads.maxPerUser) {
            throw new Error(`You can join up to ${SECURITY_LIMITS.squads.maxPerUser} squads`);
        }

        const now = Date.now();

        const passwordHash = await hashPassword(args.password);

        const squadId = await ctx.db.insert("squads", {
            name: args.name.trim(),
            passwordHash,
            createdBy: userId,
            createdAt: now,
            ...(args.avatarStorageId ? { avatarStorageId: args.avatarStorageId } : {}),
        });

        await ctx.db.insert("memberships", {
            userId,
            squadId,
            nickname: args.nickname.trim(),
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

        await assertRateLimit(ctx, ["joinSquad", userId], SECURITY_LIMITS.rate.joinSquad);

        assertNonEmpty("Squad name", args.squadName);
        assertNonEmpty("Password", args.password);
        assertNonEmpty("Nickname", args.nickname);
        assertLength("Nickname", args.nickname, 30);
        if (args.vibe) assertLength("Vibe", args.vibe, 30);
        if (args.statusText) assertLength("Status", args.statusText, 100);

        const squad = await ctx.db
            .query("squads")
            .withIndex("by_name", (q) => q.eq("name", args.squadName.trim()))
            .first();

        if (!squad) throw new Error("Space not found");

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

        const [userMemberships, squadMemberships] = await Promise.all([
            ctx.db
                .query("memberships")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .take(SECURITY_LIMITS.squads.maxPerUser),
            ctx.db
                .query("memberships")
                .withIndex("by_squad", (q) => q.eq("squadId", squadId))
                .take(SECURITY_LIMITS.squads.maxMembers),
        ]);
        if (userMemberships.length >= SECURITY_LIMITS.squads.maxPerUser) {
            throw new Error(`You can join up to ${SECURITY_LIMITS.squads.maxPerUser} squads`);
        }
        if (squadMemberships.length >= SECURITY_LIMITS.squads.maxMembers) {
            throw new Error("This squad is full");
        }

        const joinedAt = Date.now();

        await ctx.db.insert("memberships", {
            userId,
            squadId: squadId,
            nickname: args.nickname.trim(),
            ...(args.vibe ? { vibe: args.vibe.trim(), vibeUpdatedAt: joinedAt } : {}),
            ...(args.statusText ? { statusText: args.statusText.trim() } : {}),
            joinedAt,
        });

        await schedulePushToSquad(ctx, {
            squadId,
            excludeUserId: userId,
            title: "Clique",
            body: `${args.nickname.trim()} joined the squad 👋`,
            data: { path: `/squad/${squadId}/members` },
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
            .take(SECURITY_LIMITS.squads.maxPerUser + 1);

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

        return await Promise.all(memberships.map(async (m) => {
            const squad = squadMap.get(m.squadId) ?? null;
            const avatarUrl = squad?.avatarStorageId
                ? await ctx.storage.getUrl(squad.avatarStorageId)
                : null;
            return {
                squad: squad ? { ...squad, avatarUrl } : null,
                membership: m,
            };
        }));
    },
});


export const getCurrentUserSquads = query({
    args: {},

    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) =>
                q.eq("userId", userId)
            )
            .take(SECURITY_LIMITS.squads.maxPerUser + 1);

        if (memberships.length === 0) return [];

        const squads = await Promise.all(
            memberships.map((m) => ctx.db.get(m.squadId))
        );

        const squadMap = new Map();
        for (const s of squads) {
            if (s) squadMap.set(s._id, s);
        }

        return await Promise.all(memberships.map(async (m) => {
            const squad = squadMap.get(m.squadId) ?? null;
            const avatarUrl = squad?.avatarStorageId
                ? await ctx.storage.getUrl(squad.avatarStorageId)
                : null;
            return {
                squad: squad ? { ...squad, avatarUrl } : null,
                membership: m,
            };
        }));
    },
});

export const getSquad = query({
    args: { id: v.id("squads") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", args.id)
            )
            .first();
        if (!membership) throw new Error("Not a member of this squad");

        const squad = await ctx.db.get(args.id);
        if (!squad) return null;

        const avatarUrl = squad.avatarStorageId
            ? await ctx.storage.getUrl(squad.avatarStorageId)
            : null;

        return { ...squad, avatarUrl };
    },
});

export const leaveSquad = mutation({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const squad = await ctx.db.get(args.squadId);
        if (!squad) throw new Error("Space not found");

        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", userId).eq("squadId", args.squadId)
            )
            .first();

        if (!membership) throw new Error("Not a member of this squad");
        if (squad.createdBy === userId) {
            throw new Error("Squad creators cannot leave yet. Remove members or add ownership transfer first.");
        }

        await ctx.db.delete(membership._id);
    },
});

export const removeSquadMember = mutation({
    args: {
        squadId: v.id("squads"),
        memberUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const squad = await ctx.db.get(args.squadId);
        if (!squad) throw new Error("Space not found");
        if (squad.createdBy !== userId) throw new Error("Only the squad creator can remove members");
        if (args.memberUserId === userId) throw new Error("Use Leave Squad for your own membership");
        if (args.memberUserId === squad.createdBy) throw new Error("The squad creator cannot be removed");

        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_squad", (q) =>
                q.eq("userId", args.memberUserId).eq("squadId", args.squadId)
            )
            .first();

        if (!membership) throw new Error("Member not found");

        await ctx.db.delete(membership._id);
        return { success: true };
    },
});

export const getSquadMembers = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const squad = await ctx.db.get(args.squadId);

        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.query.maxSquadMembersRead);

        const enriched = await Promise.all(
            memberships.map(async (m) => {
                // Get avatar: check userAvatars table first, then user.image
                const [avatar, user] = await Promise.all([
                    ctx.db
                        .query("userAvatars")
                        .withIndex("by_user", (q) => q.eq("userId", m.userId))
                        .first(),
                    ctx.db.get(m.userId),
                ]);
                let avatarUrl: string | null = null;
                if (avatar) {
                    avatarUrl = await ctx.storage.getUrl(avatar.storageId);
                } else if (user?.image) {
                    avatarUrl = user.image;
                }
                return {
                    userId: m.userId,
                    nickname: m.nickname,
                    vibe: m.vibe ?? null,
                    vibeLabel: m.vibeLabel ?? null,
                    statusText: m.statusText ?? null,
                    joinedAt: m.joinedAt,
                    lastActiveAt: m.lastActiveAt ?? null,
                    isOnline: Date.now() - (m.lastActiveAt ?? 0) < 30000,
                    avatarUrl,
                    isMe: m.userId === userId,
                    isOwner: squad?.createdBy === m.userId,
                };
            })
        );

        // Sort: current user first, then by joinedAt ascending
        return enriched.sort((a, b) => {
            if (a.isMe) return -1;
            if (b.isMe) return 1;
            return a.joinedAt - b.joinedAt;
        });
    },
});

export const getSquadMemberProfile = query({
    args: {
        squadId: v.id("squads"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId: currentUserId } = await requireMembership(ctx, args.squadId);
        const [squad, membership] = await Promise.all([
            ctx.db.get(args.squadId),
            ctx.db
                .query("memberships")
                .withIndex("by_user_squad", (q) => q.eq("userId", args.userId).eq("squadId", args.squadId))
                .first(),
        ]);

        if (!membership) return null;

        const [avatar, user] = await Promise.all([
            ctx.db
                .query("userAvatars")
                .withIndex("by_user", (q) => q.eq("userId", membership.userId))
                .first(),
            ctx.db.get(membership.userId),
        ]);

        let avatarUrl: string | null = null;
        if (avatar) {
            avatarUrl = await ctx.storage.getUrl(avatar.storageId);
        } else if (user?.image) {
            avatarUrl = user.image;
        }

        return {
            userId: membership.userId,
            nickname: membership.nickname,
            name: user?.name ?? null,
            email: user?.email ?? null,
            avatarUrl,
            vibe: membership.vibe ?? null,
            vibeLabel: membership.vibeLabel ?? null,
            statusText: membership.statusText ?? null,
            joinedAt: membership.joinedAt,
            lastActiveAt: membership.lastActiveAt ?? null,
            isOnline: Date.now() - (membership.lastActiveAt ?? 0) < 30000,
            isMe: membership.userId === currentUserId,
            isOwner: squad?.createdBy === membership.userId,
        };
    },
});

export const updateSquadSettings = mutation({
    args: {
        squadId: v.id("squads"),
        name: v.optional(v.string()),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        const squad = await ctx.db.get(args.squadId);
        if (!squad) throw new Error("Space not found");
        if (squad.createdBy !== userId) throw new Error("Only the squad creator can update settings");

        const updates: { name?: string; passwordHash?: string } = {};

        if (args.name !== undefined) {
            assertNonEmpty("Name", args.name);
            assertLength("Name", args.name, 50);
            updates.name = args.name.trim();
        }

        if (args.password !== undefined) {
            assertNonEmpty("Password", args.password);
            assertLength("Password", args.password, 100);
            updates.passwordHash = await hashPassword(args.password);
        }

        if (Object.keys(updates).length === 0) return { success: true };

        await ctx.db.patch(args.squadId, updates);
        return { success: true };
    },
});
