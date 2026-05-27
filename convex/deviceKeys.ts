// convex/deviceKeys.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_DEVICES = 3;

export const registerDevice = mutation({
    args: {
        deviceId:   v.string(),
        publicKey:  v.string(),
        deviceName: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const existing = await ctx.db
            .query("deviceKeys")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const dup = existing.find((d) => d.deviceId === args.deviceId);
        if (dup) {
            await ctx.db.patch(dup._id, { lastSeen: Date.now() });
            return;
        }

        if (existing.length >= MAX_DEVICES) {
            throw new Error("MAX_DEVICES_REACHED");
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
        return ctx.db
            .query("deviceKeys")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});

export const removeDevice = mutation({
    args: { deviceId: v.string() },
    handler: async (ctx, { deviceId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

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
