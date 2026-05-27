import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAvatarUrl } from "./users";

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

        // Guard: users must share at least one squad to start a DM
        const mySquads = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const theirSquads = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", otherUserId))
            .collect();
        const mySquadIds = new Set(mySquads.map((m) => m.squadId));
        const hasCommon = theirSquads.some((m) => mySquadIds.has(m.squadId));
        if (!hasCommon) throw new Error("You can only DM someone in a shared squad");

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

        // Atomic sequence increment — this is the message's order number
        const seq = conv.lastSeq + 1;
        await ctx.db.patch(conv._id, { lastSeq: seq, lastEnvelopeAt: Date.now() });

        const serverTimestamp = Date.now();

        for (const e of envelopes) {
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

        return ctx.db
            .query("messageEnvelopes")
            .withIndex("by_recipient_device", (q) =>
                q.eq("recipientId", userId)
                 .eq("recipientDeviceId", recipientDeviceId)
                 .eq("delivered", false)
            )
            .order("asc")
            .take(50);
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
            .collect();

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
                .collect();

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
                    name: user?.name ?? squadMember.nickname ?? user?.email ?? "Unknown",
                    avatarUrl,
                    squadNames: [squad.name],
                });
            }
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
            .withIndex("by_user_a", (q) => q.eq("participantA", userId)).collect();
        const asB = await ctx.db.query("dmConversations")
            .withIndex("by_user_b", (q) => q.eq("participantB", userId)).collect();

        return Promise.all([...asA, ...asB].map(async (conv) => {
            const otherId = conv.participantA === userId
                ? conv.participantB : conv.participantA;
            const other = await ctx.db.get(otherId);
            const avatar = await getAvatarUrl(ctx, otherId);
            return {
                _id: conv._id,
                otherUserId: otherId,
                otherUserName: other?.name ?? other?.email ?? "Unknown",
                otherUserAvatar: avatar,
                lastSeq: conv.lastSeq,
                lastEnvelopeAt: conv.lastEnvelopeAt ?? conv.createdAt,
                createdAt: conv.createdAt,
            };
        }));
    },
});