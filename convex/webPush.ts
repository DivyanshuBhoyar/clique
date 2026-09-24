"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const pushDataValidator = v.record(v.string(), v.string());

const webPushSubscriptionValidator = v.object({
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
});

function getVapidConfig() {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY
        ?? process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:developer@clique.divb.space";

    if (!publicKey || !privateKey) {
        return null;
    }

    return { publicKey, privateKey, subject };
}

/**
 * Node action: deliver Web Push to browser PushSubscription endpoints.
 * Native Expo tokens stay on `push.sendPush` (default Convex runtime).
 */
export const sendWebPush = internalAction({
    args: {
        subscriptions: v.array(webPushSubscriptionValidator),
        title: v.string(),
        body: v.string(),
        data: v.optional(pushDataValidator),
    },
    handler: async (ctx, args) => {
        const vapid = getVapidConfig();
        if (!vapid) {
            console.warn("Web Push skipped: set WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY on Convex.");
            return { sent: 0, skipped: args.subscriptions.length };
        }

        webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

        const payload = JSON.stringify({
            title: args.title,
            body: args.body,
            data: args.data ?? {},
        });

        let sent = 0;
        for (const sub of args.subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    payload,
                );
                sent += 1;
            } catch (error) {
                const statusCode =
                    typeof error === "object"
                    && error !== null
                    && "statusCode" in error
                        ? Number((error as { statusCode?: number }).statusCode)
                        : undefined;

                // Gone / unsubscribed — drop stored subscription.
                if (statusCode === 404 || statusCode === 410) {
                    await ctx.runMutation(internal.push.clearWebPushSubscriptionByEndpoint, {
                        endpoint: sub.endpoint,
                    });
                } else {
                    console.warn("Web Push delivery failed", {
                        statusCode,
                        endpointHost: (() => {
                            try {
                                return new URL(sub.endpoint).host;
                            } catch {
                                return "invalid-endpoint";
                            }
                        })(),
                    });
                }
            }
        }

        return { sent };
    },
});
