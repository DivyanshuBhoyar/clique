import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertArrayLimit, assertRateLimit, assertUsersShareSquad } from "./security";
import { getAvatarUrl } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

export const getOrCreateConversation = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, { otherUserId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");
        if (userId === otherUserId) throw new Error("Cannot DM yourself");

        const [participantA, participantB] =
            userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

        const existing = await ctx.db
            .query("dmConversations")
            .withIndex("by_participants", (q) =>
                q.eq("participantA", participantA).eq("participantB", participantB)
            )
            .first();

        if (existing) return existing._id;

        await assertRateLimit(ctx, ["dmConversation", userId], SECURITY_LIMITS.rate.dmConversation);
        await assertUsersShareSquad(ctx, userId, otherUserId);

        const [asA, asB] = await Promise.all([
            ctx.db
                .query("dmConversations")
                .withIndex("by_user_a", (q) => q.eq("participantA", userId))
                .take(SECURITY_LIMITS.dm.maxConversationsPerUser),
            ctx.db
                .query("dmConversations")
                .withIndex("by_user_b", (q) => q.eq("participantB", userId))
                .take(SECURITY_LIMITS.dm.maxConversationsPerUser),
        ]);
        if (asA.length + asB.length >= SECURITY_LIMITS.dm.maxConversationsPerUser) {
            throw new Error("DM conversation limit reached");
        }

        return await ctx.db.insert("dmConversations", {
            participantA,
            participantB,
            lastSeq: 0,
            lastEnvelopeAt: Date.now(),
            createdAt: Date.now(),
        });
    },
});

export const sendFanOut = mutation({
    args: {
        conversationId: v.id("dmConversations"),
        envelopes: v.array(v.object({
            messageId:         v.string(),
            payloadType:       v.union(
                v.literal("message"),
                v.literal("receipt"),
                v.literal("edit"),
                v.literal("delete"),
                v.literal("reaction"),
            ),
            recipientId:       v.id("users"),
            recipientDeviceId: v.string(),
            ciphertext:        v.string(),
            nonce:             v.string(),
            senderPublicKey:   v.string(),
            senderDeviceId:    v.string(),
        })),
    },
    handler: async (ctx, { conversationId, envelopes }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const conv = await ctx.db.get(conversationId);
        if (!conv) throw new Error("Conversation not found");
        if (conv.participantA !== userId && conv.participantB !== userId) {
            throw new Error("FORBIDDEN");
        }

        await assertRateLimit(ctx, ["sendDm", conversationId, userId], SECURITY_LIMITS.rate.sendDm);
        assertArrayLimit("DM envelopes", envelopes, SECURITY_LIMITS.dm.maxEnvelopesPerFanOut);
        if (envelopes.length === 0) throw new Error("At least one envelope is required");

        // Atomic sequence increment — this is the message's order number
        const seq = conv.lastSeq + 1;
        await ctx.db.patch(conv._id, { lastSeq: seq, lastEnvelopeAt: Date.now() });

        const serverTimestamp = Date.now();

        for (const e of envelopes) {
            if (e.recipientId !== conv.participantA && e.recipientId !== conv.participantB) {
                throw new Error("Invalid recipient");
            }
            assertNonEmpty("Message id", e.messageId);
            assertLength("Message id", e.messageId, 100);
            assertLength("Recipient device id", e.recipientDeviceId, 100);
            assertLength("Sender device id", e.senderDeviceId, 100);
            assertLength("Sender public key", e.senderPublicKey, 200);
            assertLength("Nonce", e.nonce, 100);
            assertLength("Ciphertext", e.ciphertext, 10000);

            await ctx.db.insert("messageEnvelopes", {
                ...e,
                senderId:        userId,
                conversationId,
                serverTimestamp,
                sequenceNumber:  seq,
                delivered:       false,
            });
        }

        return { sequenceNumber: seq, serverTimestamp };
    },
});

export const pendingForDevice = query({
    args: { recipientDeviceId: v.string() },
    handler: async (ctx, { recipientDeviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        assertLength("Recipient device id", recipientDeviceId, 100);

        return ctx.db
            .query("messageEnvelopes")
            .withIndex("by_recipient_device", (q) =>
                q.eq("recipientId", userId)
                 .eq("recipientDeviceId", recipientDeviceId)
                 .eq("delivered", false)
            )
            .order("asc")
            .take(SECURITY_LIMITS.dm.maxPendingPerDevice);
    },
});

export const markDelivered = mutation({
    args: { envelopeId: v.id("messageEnvelopes") },
    handler: async (ctx, { envelopeId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");
        const env = await ctx.db.get(envelopeId);
        if (!env || env.recipientId !== userId) throw new Error("FORBIDDEN");
        await ctx.db.patch(envelopeId, { delivered: true });
    },
});

export const getDmableUsers = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const myMemberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.query.maxDmableSquads);

        const usersById = new Map<string, {
            userId: typeof userId;
            name: string;
            avatarUrl: string | null;
            squadNames: string[];
        }>();

        for (const membership of myMemberships) {
            const squad = await ctx.db.get(membership.squadId);
            if (!squad) continue;

            const squadMembers = await ctx.db
                .query("memberships")
                .withIndex("by_squad", (q) => q.eq("squadId", membership.squadId))
                .take(SECURITY_LIMITS.query.maxSquadMembersRead);

            for (const squadMember of squadMembers) {
                if (squadMember.userId === userId) continue;

                const key = squadMember.userId;
                const existing = usersById.get(key);
                if (existing) {
                    if (!existing.squadNames.includes(squad.name)) {
                        existing.squadNames.push(squad.name);
                    }
                    continue;
                }

                const [user, avatarUrl] = await Promise.all([
                    ctx.db.get(squadMember.userId),
                    getAvatarUrl(ctx, squadMember.userId),
                ]);

                usersById.set(key, {
                    userId: squadMember.userId,
                    name: user?.name ?? user?.email ?? squadMember.nickname ?? "Unknown",
                    avatarUrl,
                    squadNames: [squad.name],
                });

                if (usersById.size >= SECURITY_LIMITS.query.maxDmableUsers) break;
            }
            if (usersById.size >= SECURITY_LIMITS.query.maxDmableUsers) break;
        }

        return Array.from(usersById.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
});

export const listConversations = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const asA = await ctx.db.query("dmConversations")
            .withIndex("by_user_a", (q) => q.eq("participantA", userId)).take(SECURITY_LIMITS.dm.maxConversationsPerUser);
        const asB = await ctx.db.query("dmConversations")
            .withIndex("by_user_b", (q) => q.eq("participantB", userId)).take(SECURITY_LIMITS.dm.maxConversationsPerUser);

        return Promise.all([...asA, ...asB].map(async (conv) => {
            const otherId = conv.participantA === userId
                ? conv.participantB : conv.participantA;
            const other = await ctx.db.get(otherId);
            const avatar = await getAvatarUrl(ctx, otherId);
            return {
                _id: conv._id,
                otherUserId: otherId,
                otherUserRealName: other?.name ?? other?.email ?? "Unknown",
                otherUserName: other?.name ?? other?.email ?? "Unknown",
                otherUserAvatar: avatar,
                lastSeq: conv.lastSeq,
                lastEnvelopeAt: conv.lastEnvelopeAt ?? conv.createdAt,
                createdAt: conv.createdAt,
            };
        }));
    },
});