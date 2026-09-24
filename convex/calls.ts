import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalMutation, mutation, query } from "./_generated/server";

const MAX_ACTIVE_CALLS_TO_CHECK = 20;
const MAX_CALL_PARTICIPANTS = 50;
const STARTING_GRACE_MS = 20_000;
const LIVE_PARTICIPANT_TTL_MS = 30_000;
const AUTO_ABORT_MS = 30_000; // abort quickly if the starter never joins

type CallDbCtx = QueryCtx | MutationCtx;

async function getOpenParticipantRows(ctx: CallDbCtx, callRoomId: Id<"callRooms">) {
    return await ctx.db
        .query("callParticipants")
        .withIndex("by_callRoomId", (q) => q.eq("callRoomId", callRoomId))
        .take(MAX_CALL_PARTICIPANTS);
}

function isParticipantLive(participant: { joinedAt: number; lastSeenAt?: number; leftAt?: number }, now: number) {
    if (participant.leftAt !== undefined) return false;
    return (participant.lastSeenAt ?? participant.joinedAt) >= now - LIVE_PARTICIPANT_TTL_MS;
}

async function getActiveParticipants(ctx: CallDbCtx, callRoomId: Id<"callRooms">, now = Date.now()) {
    const participants = await getOpenParticipantRows(ctx, callRoomId);

    return participants.filter((p) => isParticipantLive(p, now));
}

async function closeStaleParticipants(ctx: MutationCtx, callRoomId: Id<"callRooms">, now = Date.now()) {
    const participants = await getOpenParticipantRows(ctx, callRoomId);
    const staleParticipants = participants.filter((p) => p.leftAt === undefined && !isParticipantLive(p, now));

    for (const participant of staleParticipants) {
        await ctx.db.patch(participant._id, { leftAt: now });
    }
}

async function getVisibleActiveCall(
    ctx: QueryCtx,
    scope:
        | { kind: "channel"; channelId: Id<"channels"> }
        | { kind: "dm"; dmConversationId: Id<"dmConversations"> },
) {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const rooms = scope.kind === "channel"
        ? await ctx.db
            .query("callRooms")
            .withIndex("by_channel_and_isActive", (q) =>
                q.eq("channelId", scope.channelId).eq("isActive", true),
            )
            .order("desc")
            .take(MAX_ACTIVE_CALLS_TO_CHECK)
        : await ctx.db
            .query("callRooms")
            .withIndex("by_dmConversationId_and_isActive", (q) =>
                q.eq("dmConversationId", scope.dmConversationId).eq("isActive", true),
            )
            .order("desc")
            .take(MAX_ACTIVE_CALLS_TO_CHECK);

    for (const room of rooms) {
        const activeParticipantCount = (await getActiveParticipants(ctx, room._id)).length;
        if (activeParticipantCount > 0) {
            return { ...room, activeParticipantCount, isStarting: false };
        }

        const starterCanAutoJoin =
            userId === room.startedBy && now - room.startedAt <= STARTING_GRACE_MS;
        if (starterCanAutoJoin) {
            return { ...room, activeParticipantCount: 0, isStarting: true };
        }
    }

    return null;
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export const getActiveChannelCall = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        return getVisibleActiveCall(ctx, { kind: "channel", channelId: args.channelId });
    },
});

export const getActiveDmCall = query({
    args: { dmConversationId: v.id("dmConversations") },
    handler: async (ctx, args) => {
        return getVisibleActiveCall(ctx, { kind: "dm", dmConversationId: args.dmConversationId });
    },
});

export const getCallParticipants = query({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        return getActiveParticipants(ctx, args.callRoomId);
    },
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const autoAbortIfEmpty = internalMutation({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.callRoomId);
        if (!room || !room.isActive) return; // already ended, nothing to do

        const now = Date.now();
        await closeStaleParticipants(ctx, args.callRoomId, now);

        const activeCount = (await getActiveParticipants(ctx, args.callRoomId, now)).length;
        if (activeCount === 0) {
            await ctx.db.patch(args.callRoomId, {
                isActive: false,
                endedAt: now,
            });
        }
    },
});

export const abortEmptyActiveCalls = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const cutoff = now - STARTING_GRACE_MS;
        const activeRooms = await ctx.db
            .query("callRooms")
            .withIndex("by_isActive", (q) => q.eq("isActive", true))
            .take(50);

        for (const room of activeRooms) {
            if (room.startedAt > cutoff) continue;

            await closeStaleParticipants(ctx, room._id, now);
            const activeCount = (await getActiveParticipants(ctx, room._id, now)).length;
            if (activeCount === 0) {
                await ctx.db.patch(room._id, {
                    isActive: false,
                    endedAt: now,
                });
            }
        }
    },
});

export const insertCallRoom = internalMutation({
    args: {
        channelId: v.optional(v.id("channels")),
        dmConversationId: v.optional(v.id("dmConversations")),
        hmsRoomId: v.string(),
        moderatorRoomCode: v.string(),
        participantRoomCode: v.string(),
        startedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        const callRoomId = await ctx.db.insert("callRooms", {
            channelId: args.channelId,
            dmConversationId: args.dmConversationId,
            hmsRoomId: args.hmsRoomId,
            moderatorRoomCode: args.moderatorRoomCode,
            participantRoomCode: args.participantRoomCode,
            isActive: true,
            startedBy: args.startedBy,
            startedAt: Date.now(),
        });

        // Auto-abort if nobody joins within the timeout window
        await ctx.scheduler.runAfter(AUTO_ABORT_MS, internal.calls.autoAbortIfEmpty, { callRoomId });

        return callRoomId;
    },
});

export const joinCall = mutation({
    args: {
        callRoomId: v.id("callRooms"),
        displayName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const room = await ctx.db.get(args.callRoomId);
        if (!room || !room.isActive) throw new Error("This call has ended.");

        // Check if already in the call (rejoining)
        const existingRows = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId_and_userId", (q) =>
                q.eq("callRoomId", args.callRoomId).eq("userId", userId),
            )
            .take(20);
        const activeParticipant = existingRows.find((p) => p.leftAt === undefined);

        if (activeParticipant) {
            // Already in the call
            return activeParticipant._id;
        }

        return ctx.db.insert("callParticipants", {
            callRoomId: args.callRoomId,
            userId,
            displayName: args.displayName,
            joinedAt: Date.now(),
            lastSeenAt: Date.now(),
        });
    },
});

export const touchCallParticipant = mutation({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const room = await ctx.db.get(args.callRoomId);
        if (!room || !room.isActive) return { active: false };

        const participantRows = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId_and_userId", (q) =>
                q.eq("callRoomId", args.callRoomId).eq("userId", userId),
            )
            .take(20);
        const participant = participantRows.find((p) => p.leftAt === undefined);

        if (!participant) return { active: true, touched: false };

        await ctx.db.patch(participant._id, { lastSeenAt: Date.now() });
        return { active: true, touched: true };
    },
});

export const leaveCall = mutation({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Mark this participant as left
        const participantRows = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId_and_userId", (q) =>
                q.eq("callRoomId", args.callRoomId).eq("userId", userId),
            )
            .take(20);
        const participant = participantRows.find((p) => p.leftAt === undefined);

        if (participant) {
            await ctx.db.patch(participant._id, { leftAt: Date.now() });
        }

        // Check if this was the last active participant
        const now = Date.now();
        await closeStaleParticipants(ctx, args.callRoomId, now);
        const activeRemaining = (await getActiveParticipants(ctx, args.callRoomId, now)).filter(
            (p) => p.leftAt === undefined && p._id !== participant?._id,
        );

        if (activeRemaining.length === 0) {
            // Last person left — end the call
            await ctx.db.patch(args.callRoomId, {
                isActive: false,
                endedAt: now,
            });
        }
    },
});

// ─── Actions (external API calls) ─────────────────────────────────────────────

/**
 * Generate a 100ms management token for server-side API calls.
 * Uses HMAC-SHA256 JWT signing (jose-compatible approach without jose import).
 */
async function generateManagementToken(): Promise<string> {
    const accessKey = process.env.HMS_APP_ACCESS_KEY;
    const secret = process.env.HMS_APP_SECRET;
    if (!accessKey || !secret) {
        throw new Error("HMS_APP_ACCESS_KEY and HMS_APP_SECRET must be set");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
        access_key: accessKey,
        type: "management",
        version: 2,
        iat: now,
        nbf: now,
        exp: now + 86400, // 24 hours
        jti: crypto.randomUUID(),
    };

    const encode = (obj: unknown) =>
        btoa(JSON.stringify(obj))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // Sign with HMAC-SHA256 using Web Crypto API
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(signingInput),
    );
    const sigB64 = btoa(Array.from(new Uint8Array(signature), (b) => String.fromCharCode(b)).join(""))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    return `${signingInput}.${sigB64}`;
}

export const createCallRoom = action({
    args: {
        channelId: v.optional(v.id("channels")),
        dmConversationId: v.optional(v.id("dmConversations")),
    },
    handler: async (ctx, args): Promise<{ callRoomId: Id<"callRooms">; roomCode: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const templateId = process.env.HMS_TEMPLATE_ID;
        if (!templateId) throw new Error("HMS_TEMPLATE_ID must be set");

        const mgmtToken = await generateManagementToken();

        // 1. Create a room
        const roomRes = await fetch("https://api.100ms.live/v2/rooms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${mgmtToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: `call-${Date.now()}`,
                template_id: templateId,
            }),
        });
        if (!roomRes.ok) {
            const err = await roomRes.text();
            throw new Error(`Failed to create HMS room: ${err}`);
        }
        const room = await roomRes.json();

        // 2. Get room codes (one per role: "moderator" and "participant")
        const codeRes = await fetch(
            `https://api.100ms.live/v2/room-codes/room/${room.id}`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${mgmtToken}` },
            },
        );
        if (!codeRes.ok) {
            const err = await codeRes.text();
            throw new Error(`Failed to get room codes: ${err}`);
        }
        const codeData = await codeRes.json();
        // Extract codes by role — 100ms returns an array of { code, role, enabled }
        const codes = codeData.data as { code: string; role: string }[];
        const moderatorCode = codes.find((c) => c.role === "moderator")?.code ?? codes[0].code;
        const participantCode = codes.find((c) => c.role === "participant")?.code ?? codes[0].code;

        // 3. Store in Convex
        const callRoomId: Id<"callRooms"> = await ctx.runMutation(internal.calls.insertCallRoom, {
            channelId: args.channelId,
            dmConversationId: args.dmConversationId,
            hmsRoomId: room.id,
            moderatorRoomCode: moderatorCode,
            participantRoomCode: participantCode,
            startedBy: userId,
        });

        // Return moderator code to the initiator
        return { callRoomId, roomCode: moderatorCode };
    },
});
