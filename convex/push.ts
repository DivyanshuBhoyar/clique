import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { SECURITY_LIMITS, assertRateLimit } from "./security";
import { requireMembership } from "./users";
import { assertLength, assertNonEmpty } from "./validators";

const MAX_EXPO_PUSH_BATCH_SIZE = 100;
const ACTIVE_CONTEXT_STALE_MS = 30_000;

const pushDataValidator = v.record(v.string(), v.string());

const pushRegistrationStageValidator = v.union(
    v.literal("notifications_import"),
    v.literal("not_physical_device"),
    v.literal("permission_denied"),
    v.literal("missing_project_id"),
    v.literal("token_request"),
    v.literal("missing_device_id"),
    v.literal("register_token"),
    v.literal("saved"),
);

const androidNotificationChannelValidator = v.union(
    v.literal("default"),
    v.literal("messages"),
    v.literal("direct"),
    v.literal("replies"),
    v.literal("social"),
    v.literal("calls"),
);

export const ANDROID_NOTIFICATION_CHANNELS = {
    default: "default",
    messages: "messages",
    direct: "direct",
    replies: "replies",
    social: "social",
    calls: "calls",
} as const;

type PushData = Record<string, string>;
type AndroidNotificationChannelId = typeof ANDROID_NOTIFICATION_CHANNELS[keyof typeof ANDROID_NOTIFICATION_CHANNELS];

type PushPayload = {
    title: string;
    body: string;
    data?: PushData;
    androidChannelId?: AndroidNotificationChannelId;
};

export type WebPushSubscription = {
    endpoint: string;
    p256dh: string;
    auth: string;
};

type PushTargets = {
    tokens: string[];
    webSubscriptions: WebPushSubscription[];
};

type ChannelPushRecipient = {
    userId: Id<"users">;
    tokens: string[];
    webSubscriptions: WebPushSubscription[];
};

function uniqueTokens(tokens: string[]) {
    return [...new Set(tokens.filter((token) => token.trim().length > 0))];
}

function uniqueWebSubscriptions(subs: WebPushSubscription[]) {
    const byEndpoint = new Map<string, WebPushSubscription>();
    for (const sub of subs) {
        const endpoint = sub.endpoint.trim();
        const p256dh = sub.p256dh.trim();
        const auth = sub.auth.trim();
        if (!endpoint || !p256dh || !auth) continue;
        byEndpoint.set(endpoint, { endpoint, p256dh, auth });
    }
    return [...byEndpoint.values()];
}

async function getPushTargetsForUsers(ctx: QueryCtx | MutationCtx, userIds: Id<"users">[]): Promise<PushTargets> {
    const tokens: string[] = [];
    const webSubscriptions: WebPushSubscription[] = [];

    for (const userId of userIds) {
        const devices = await ctx.db
            .query("deviceKeys")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(SECURITY_LIMITS.dm.maxUserDevices);

        for (const device of devices) {
            if (device.pushToken) tokens.push(device.pushToken);
            if (device.webPushEndpoint && device.webPushP256dh && device.webPushAuth) {
                webSubscriptions.push({
                    endpoint: device.webPushEndpoint,
                    p256dh: device.webPushP256dh,
                    auth: device.webPushAuth,
                });
            }
        }
    }

    return {
        tokens: uniqueTokens(tokens),
        webSubscriptions: uniqueWebSubscriptions(webSubscriptions),
    };
}

async function getTokensForUsers(ctx: QueryCtx | MutationCtx, userIds: Id<"users">[]) {
    return (await getPushTargetsForUsers(ctx, userIds)).tokens;
}

async function isUserActiveInChannel(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">,
    channelId: Id<"channels">,
) {
    const active = await ctx.db
        .query("notificationPresence")
        .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", channelId))
        .first();

    return active?.kind === "channel" && Date.now() - active.lastSeenAt < ACTIVE_CONTEXT_STALE_MS;
}

async function isUserActiveInApp(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
    const active = await ctx.db
        .query("notificationPresence")
        .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", "app"))
        .first();

    return Date.now() - (active?.lastSeenAt ?? 0) < ACTIVE_CONTEXT_STALE_MS;
}

async function isUserActiveInConversation(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">,
    conversationId: Id<"dmConversations">,
) {
    const active = await ctx.db
        .query("notificationPresence")
        .withIndex("by_user_conversation", (q) => q.eq("userId", userId).eq("conversationId", conversationId))
        .first();

    return active?.kind === "dm" && Date.now() - active.lastSeenAt < ACTIVE_CONTEXT_STALE_MS;
}

export async function schedulePush(
    ctx: MutationCtx,
    args: PushPayload & {
        tokens?: string[];
        webSubscriptions?: WebPushSubscription[];
    },
) {
    const tokens = uniqueTokens(args.tokens ?? []);
    const webSubscriptions = uniqueWebSubscriptions(args.webSubscriptions ?? []);
    if (tokens.length === 0 && webSubscriptions.length === 0) return;

    if (tokens.length > 0) {
        await ctx.scheduler.runAfter(0, internal.push.sendPush, {
            tokens,
            title: args.title,
            body: args.body,
            ...(args.data ? { data: args.data } : {}),
            ...(args.androidChannelId ? { androidChannelId: args.androidChannelId } : {}),
        });
    }

    if (webSubscriptions.length > 0) {
        await ctx.scheduler.runAfter(0, internal.webPush.sendWebPush, {
            subscriptions: webSubscriptions,
            title: args.title,
            body: args.body,
            ...(args.data ? { data: args.data } : {}),
        });
    }
}

export async function schedulePushToUser(
    ctx: MutationCtx,
    args: PushPayload & {
        userId: Id<"users">;
        excludeUserId?: Id<"users">;
        suppressIfActiveChannelId?: Id<"channels">;
        suppressIfActiveConversationId?: Id<"dmConversations">;
    },
) {
    if (args.excludeUserId && args.userId === args.excludeUserId) return;

    const isAppActive: boolean = await ctx.runQuery(internal.push.isActiveInApp, {
        userId: args.userId,
    });
    if (isAppActive) return;

    if (args.suppressIfActiveChannelId) {
        const isActive: boolean = await ctx.runQuery(internal.push.isActiveInChannel, {
            userId: args.userId,
            channelId: args.suppressIfActiveChannelId,
        });
        if (isActive) return;
    }

    if (args.suppressIfActiveConversationId) {
        const isActive: boolean = await ctx.runQuery(internal.push.isActiveInConversation, {
            userId: args.userId,
            conversationId: args.suppressIfActiveConversationId,
        });
        if (isActive) return;
    }

    const targets: PushTargets = await ctx.runQuery(internal.push.getPushTargetsForUser, {
        userId: args.userId,
    });
    await schedulePush(ctx, {
        ...args,
        tokens: targets.tokens,
        webSubscriptions: targets.webSubscriptions,
    });
}

export const markAppActive = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["notificationPresence", "app", userId], SECURITY_LIMITS.rate.presence);

        const existing = await ctx.db
            .query("notificationPresence")
            .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", "app"))
            .first();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { lastSeenAt: now });
            return { active: true };
        }

        await ctx.db.insert("notificationPresence", {
            userId,
            kind: "app",
            lastSeenAt: now,
        });

        return { active: true };
    },
});

export const markChannelActive = mutation({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const { userId } = await requireMembership(ctx, args.squadId);
        await assertRateLimit(ctx, ["notificationPresence", "channel", args.channelId, userId], SECURITY_LIMITS.rate.presence);

        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) throw new Error("Invalid channel");

        if (channel.type === "private") {
            const channelMembership = await ctx.db
                .query("channelMemberships")
                .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
                .first();
            if (!channelMembership) throw new Error("Not a member of this channel");
        }

        const existing = await ctx.db
            .query("notificationPresence")
            .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channelId", args.channelId))
            .first();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { lastSeenAt: now });
            return { active: true };
        }

        await ctx.db.insert("notificationPresence", {
            userId,
            kind: "channel",
            channelId: args.channelId,
            lastSeenAt: now,
        });

        return { active: true };
    },
});

export const markDmConversationActive = mutation({
    args: { conversationId: v.id("dmConversations") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["notificationPresence", "dm", args.conversationId, userId], SECURITY_LIMITS.rate.presence);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");
        if (conversation.participantA !== userId && conversation.participantB !== userId) {
            throw new Error("FORBIDDEN");
        }

        const existing = await ctx.db
            .query("notificationPresence")
            .withIndex("by_user_conversation", (q) => q.eq("userId", userId).eq("conversationId", args.conversationId))
            .first();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { lastSeenAt: now });
            return { active: true };
        }

        await ctx.db.insert("notificationPresence", {
            userId,
            kind: "dm",
            conversationId: args.conversationId,
            lastSeenAt: now,
        });

        return { active: true };
    },
});

export async function schedulePushToSquad(
    ctx: MutationCtx,
    args: PushPayload & {
        squadId: Id<"squads">;
        excludeUserId?: Id<"users">;
    },
) {
    const targets: PushTargets = await ctx.runQuery(internal.push.getPushTargetsForSquad, {
        squadId: args.squadId,
        ...(args.excludeUserId ? { excludeUserId: args.excludeUserId } : {}),
    });
    await schedulePush(ctx, {
        ...args,
        tokens: targets.tokens,
        webSubscriptions: targets.webSubscriptions,
    });
}

export const registerToken = mutation({
    args: {
        deviceId: v.string(),
        pushToken: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["registerPushToken", userId], SECURITY_LIMITS.rate.registerDevice);
        assertNonEmpty("Device id", args.deviceId);
        assertLength("Device id", args.deviceId, 100);
        assertNonEmpty("Push token", args.pushToken);
        assertLength("Push token", args.pushToken, 300);

        const result: { saved: boolean } = await ctx.runMutation(internal.push.savePushToken, {
            userId,
            deviceId: args.deviceId,
            pushToken: args.pushToken,
        });
        return result;
    },
});

export const registerWebPushSubscription = mutation({
    args: {
        deviceId: v.string(),
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["registerWebPush", userId], SECURITY_LIMITS.rate.registerDevice);
        assertNonEmpty("Device id", args.deviceId);
        assertLength("Device id", args.deviceId, 100);
        assertNonEmpty("Web push endpoint", args.endpoint);
        assertLength("Web push endpoint", args.endpoint, 2048);
        assertNonEmpty("Web push p256dh", args.p256dh);
        assertLength("Web push p256dh", args.p256dh, 200);
        assertNonEmpty("Web push auth", args.auth);
        assertLength("Web push auth", args.auth, 200);

        const result: { saved: boolean } = await ctx.runMutation(internal.push.saveWebPushSubscription, {
            userId,
            deviceId: args.deviceId,
            endpoint: args.endpoint,
            p256dh: args.p256dh,
            auth: args.auth,
        });
        return result;
    },
});

export const reportRegistrationIssue = mutation({
    args: {
        stage: pushRegistrationStageValidator,
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        await assertRateLimit(ctx, ["reportPushRegistrationIssue", userId], SECURITY_LIMITS.rate.registerDevice);
        assertNonEmpty("Push registration message", args.message);
        assertLength("Push registration message", args.message, 500);

        console.warn("Push registration issue", {
            userId,
            stage: args.stage,
            message: args.message,
            timestamp: Date.now(),
        });

        return { reported: true };
    },
});

export const savePushToken = internalMutation({
    args: {
        userId: v.id("users"),
        deviceId: v.string(),
        pushToken: v.string(),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query("deviceKeys")
            .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
            .first();

        if (!device || device.userId !== args.userId) {
            throw new Error("FORBIDDEN");
        }

        await ctx.db.patch(device._id, {
            pushToken: args.pushToken,
            lastSeen: Date.now(),
        });

        return { saved: true };
    },
});

export const saveWebPushSubscription = internalMutation({
    args: {
        userId: v.id("users"),
        deviceId: v.string(),
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query("deviceKeys")
            .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
            .first();

        if (!device || device.userId !== args.userId) {
            throw new Error("FORBIDDEN");
        }

        // One endpoint should map to one device row — clear duplicates first.
        const existingWithEndpoint = await ctx.db
            .query("deviceKeys")
            .withIndex("by_web_push_endpoint", (q) => q.eq("webPushEndpoint", args.endpoint))
            .take(SECURITY_LIMITS.dm.maxUserDevices);

        for (const other of existingWithEndpoint) {
            if (other._id === device._id) continue;
            await ctx.db.patch(other._id, {
                webPushEndpoint: undefined,
                webPushP256dh: undefined,
                webPushAuth: undefined,
            });
        }

        await ctx.db.patch(device._id, {
            webPushEndpoint: args.endpoint,
            webPushP256dh: args.p256dh,
            webPushAuth: args.auth,
            lastSeen: Date.now(),
        });

        return { saved: true };
    },
});

export const clearWebPushSubscriptionByEndpoint = internalMutation({
    args: { endpoint: v.string() },
    handler: async (ctx, args) => {
        const devices = await ctx.db
            .query("deviceKeys")
            .withIndex("by_web_push_endpoint", (q) => q.eq("webPushEndpoint", args.endpoint))
            .take(SECURITY_LIMITS.dm.maxUserDevices);

        for (const device of devices) {
            await ctx.db.patch(device._id, {
                webPushEndpoint: undefined,
                webPushP256dh: undefined,
                webPushAuth: undefined,
            });
        }

        return { cleared: devices.length };
    },
});

export const getTokensForUser = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return getTokensForUsers(ctx, [args.userId]);
    },
});

export const getPushTargetsForUser = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args): Promise<PushTargets> => {
        return getPushTargetsForUsers(ctx, [args.userId]);
    },
});

export const getTokensForSquad = internalQuery({
    args: {
        squadId: v.id("squads"),
        excludeUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.query.maxSquadMembersRead);

        const recipientIds = memberships
            .map((membership) => membership.userId)
            .filter((userId) => userId !== args.excludeUserId);

        return getTokensForUsers(ctx, recipientIds);
    },
});

export const getPushTargetsForSquad = internalQuery({
    args: {
        squadId: v.id("squads"),
        excludeUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, args): Promise<PushTargets> => {
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
            .take(SECURITY_LIMITS.query.maxSquadMembersRead);

        const recipientIds = memberships
            .map((membership) => membership.userId)
            .filter((userId) => userId !== args.excludeUserId);

        return getPushTargetsForUsers(ctx, recipientIds);
    },
});

export const getRecipientsForChannel = internalQuery({
    args: {
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        excludeUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, args): Promise<ChannelPushRecipient[]> => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.squadId !== args.squadId) return [];

        const userIds = channel.type === "private"
            ? (await ctx.db
                .query("channelMemberships")
                .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
                .take(SECURITY_LIMITS.squads.maxPrivateChannelMembers))
                .map((membership) => membership.userId)
            : (await ctx.db
                .query("memberships")
                .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
                .take(SECURITY_LIMITS.query.maxSquadMembersRead))
                .map((membership) => membership.userId);

        const recipients: ChannelPushRecipient[] = [];
        for (const userId of userIds) {
            if (userId === args.excludeUserId) continue;
            if (await isUserActiveInApp(ctx, userId)) continue;
            if (await isUserActiveInChannel(ctx, userId, args.channelId)) continue;
            const targets = await getPushTargetsForUsers(ctx, [userId]);
            if (targets.tokens.length > 0 || targets.webSubscriptions.length > 0) {
                recipients.push({
                    userId,
                    tokens: targets.tokens,
                    webSubscriptions: targets.webSubscriptions,
                });
            }
        }

        return recipients;
    },
});

export const isActiveInChannel = internalQuery({
    args: {
        userId: v.id("users"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        return isUserActiveInChannel(ctx, args.userId, args.channelId);
    },
});

export const isActiveInApp = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return isUserActiveInApp(ctx, args.userId);
    },
});

export const isActiveInConversation = internalQuery({
    args: {
        userId: v.id("users"),
        conversationId: v.id("dmConversations"),
    },
    handler: async (ctx, args) => {
        return isUserActiveInConversation(ctx, args.userId, args.conversationId);
    },
});

export const sendPush = internalAction({
    args: {
        tokens: v.array(v.string()),
        title: v.string(),
        body: v.string(),
        data: v.optional(pushDataValidator),
        androidChannelId: v.optional(androidNotificationChannelValidator),
    },
    handler: async (_ctx, args) => {
        const tokens = uniqueTokens(args.tokens);
        if (tokens.length === 0) return { sent: 0 };

        let sent = 0;
        for (let i = 0; i < tokens.length; i += MAX_EXPO_PUSH_BATCH_SIZE) {
            const chunk = tokens.slice(i, i + MAX_EXPO_PUSH_BATCH_SIZE);
            const messages = chunk.map((token) => ({
                to: token,
                title: args.title,
                body: args.body,
                data: args.data ?? {},
                sound: "default",
                ...(args.androidChannelId ? { channelId: args.androidChannelId } : {}),
            }));

            try {
                const response = await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(messages),
                });

                if (!response.ok) {
                    console.warn(`Expo push request failed with status ${response.status}`);
                    continue;
                }

                sent += chunk.length;
            } catch (error) {
                console.warn("Expo push request failed", error);
            }
        }

        return { sent };
    },
});
