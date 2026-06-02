import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";

// ─── Queries ───────────────────────────────────────────────────────────────────

export const getActiveChannelCall = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("callRooms")
            .withIndex("by_channel_and_isActive", (q) =>
                q.eq("channelId", args.channelId).eq("isActive", true),
            )
            .first();
    },
});

export const getActiveDmCall = query({
    args: { dmConversationId: v.id("dmConversations") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("callRooms")
            .withIndex("by_dmConversationId_and_isActive", (q) =>
                q.eq("dmConversationId", args.dmConversationId).eq("isActive", true),
            )
            .first();
    },
});

export const getCallParticipants = query({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        const participants = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId", (q) => q.eq("callRoomId", args.callRoomId))
            .take(50);
        // Only return active participants (haven't left yet)
        return participants.filter((p) => p.leftAt === undefined);
    },
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

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
        return ctx.db.insert("callRooms", {
            channelId: args.channelId,
            dmConversationId: args.dmConversationId,
            hmsRoomId: args.hmsRoomId,
            moderatorRoomCode: args.moderatorRoomCode,
            participantRoomCode: args.participantRoomCode,
            isActive: true,
            startedBy: args.startedBy,
            startedAt: Date.now(),
        });
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

        // Check if already in the call (rejoining)
        const existing = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId_and_userId", (q) =>
                q.eq("callRoomId", args.callRoomId).eq("userId", userId),
            )
            .first();

        if (existing && existing.leftAt === undefined) {
            // Already in the call
            return existing._id;
        }

        return ctx.db.insert("callParticipants", {
            callRoomId: args.callRoomId,
            userId,
            displayName: args.displayName,
            joinedAt: Date.now(),
        });
    },
});

export const leaveCall = mutation({
    args: { callRoomId: v.id("callRooms") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Mark this participant as left
        const participant = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId_and_userId", (q) =>
                q.eq("callRoomId", args.callRoomId).eq("userId", userId),
            )
            .first();

        if (participant && participant.leftAt === undefined) {
            await ctx.db.patch(participant._id, { leftAt: Date.now() });
        }

        // Check if this was the last active participant
        const remaining = await ctx.db
            .query("callParticipants")
            .withIndex("by_callRoomId", (q) => q.eq("callRoomId", args.callRoomId))
            .take(50);
        const activeRemaining = remaining.filter(
            (p) => p.leftAt === undefined && p._id !== participant?._id,
        );

        if (activeRemaining.length === 0) {
            // Last person left — end the call
            await ctx.db.patch(args.callRoomId, {
                isActive: false,
                endedAt: Date.now(),
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
