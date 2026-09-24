// convex/deviceKeys.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit, assertUsersShareSquad } from "./security";
import { assertLength, assertNonEmpty } from "./validators";

export const registerDevice = mutation({
    args: {
        deviceId:   v.string(),
        publicKey:  v.string(),
        deviceName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertNonEmpty("Device id", args.deviceId);
        assertLength("Device id", args.deviceId, 100);
        assertNonEmpty("Public key", args.publicKey);
        assertLength("Public key", args.publicKey, 200);
        assertLength("Device name", args.deviceName, 80);

        const existing = await ctx.db
            .query("deviceKeys")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.dm.maxUserDevices);

        const dup = existing.find((d) => d.deviceId === args.deviceId);
        if (dup) {
            await ctx.db.patch(dup._id, { lastSeen: Date.now() });
            return;
        }

        await assertRateLimit(ctx, ["registerDevice", userId], SECURITY_LIMITS.rate.registerDevice);

        if (existing.length >= SECURITY_LIMITS.dm.maxUserDevices) {
            // Evict the least-recently-seen device to make room.
            // Sorted ascending by lastSeen — first element is the oldest.
            const oldest = existing.slice().sort((a, b) => a.lastSeen - b.lastSeen)[0];
            await ctx.db.delete(oldest._id);
        }

        await ctx.db.insert("deviceKeys", {
            userId,
            deviceId:   args.deviceId,
            publicKey:  args.publicKey,
            deviceName: args.deviceName,
            createdAt:  Date.now(),
            lastSeen:   Date.now(),
        });

        // Notify other devices
        await ctx.db.insert("dmSystemEvents", {
            userId,
            type:       "NEW_DEVICE",
            deviceId:   args.deviceId,
            deviceName: args.deviceName,
            timestamp:  Date.now(),
        });
    },
});

export const getDevicesForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const currentUserId = await getAuthUserId(ctx);
        if (!currentUserId) throw new Error("Unauthenticated");
        if (currentUserId !== userId) {
            await assertUsersShareSquad(ctx, currentUserId, userId);
        }

        const devices = await ctx.db
            .query("deviceKeys")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.dm.maxUserDevices);

        return devices.map((device) => ({
            userId: device.userId,
            deviceId: device.deviceId,
            publicKey: device.publicKey,
        }));
    },
});

export const removeDevice = mutation({
    args: { deviceId: v.string() },
    handler: async (ctx, { deviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Device id", deviceId, 100);

        const device = await ctx.db
            .query("deviceKeys")
            .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
            .first();

        if (!device || device.userId !== userId) throw new Error("FORBIDDEN");
        await ctx.db.delete(device._id);
    },
});

export const updateDeviceKey = mutation({
    args: { deviceId: v.string(), publicKey: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        assertLength("Device id", args.deviceId, 100);
        assertNonEmpty("Public key", args.publicKey);
        assertLength("Public key", args.publicKey, 200);

        const device = await ctx.db
            .query("deviceKeys")
            .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
            .first();

        if (!device || device.userId !== userId) throw new Error("FORBIDDEN");
        await ctx.db.patch(device._id, {
            publicKey: args.publicKey,
            lastSeen:  Date.now(),
        });
    },
});
