/* Clique Web Push service worker — no app bundle, browser APIs only. */

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("pushsubscriptionchange", (event) => {
    // iOS/browser rotate push endpoints. Best-effort: notify any open page
    // so it can re-subscribe with a fresh VAPID subscribe. The app also
    // re-subscribes on next load via getSubscription().
    event.waitUntil(
        (async () => {
            try {
                const subscription = await self.registration.pushManager.getSubscription();
                if (!subscription) return;
                const json = subscription.toJSON();
                const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
                for (const client of clients) {
                    client.postMessage({
                        type: "clique-pushsubscriptionchange",
                        subscription: {
                            endpoint: json.endpoint,
                            p256dh: json.keys && json.keys.p256dh,
                            auth: json.keys && json.keys.auth,
                        },
                    });
                }
            } catch {
                // best-effort
            }
        })(),
    );
});

self.addEventListener("push", (event) => {
    let payload = {
        title: "Clique",
        body: "Something new in your space",
        data: {},
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            payload = {
                title: typeof parsed.title === "string" && parsed.title.length > 0
                    ? parsed.title
                    : payload.title,
                body: typeof parsed.body === "string" && parsed.body.length > 0
                    ? parsed.body
                    : payload.body,
                data: parsed.data && typeof parsed.data === "object" ? parsed.data : {},
            };
        }
    } catch {
        // keep defaults
    }

    const path = typeof payload.data.path === "string" ? payload.data.path : "/";

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            data: {
                ...payload.data,
                path,
            },
            icon: "/icon-192.png",
            badge: "/icon-192.png",
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const path =
        event.notification?.data && typeof event.notification.data.path === "string"
            ? event.notification.data.path
            : "/";

    const targetUrl = new URL(path, self.location.origin).href;

    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });

            for (const client of allClients) {
                if ("focus" in client) {
                    await client.focus();
                    if ("navigate" in client && typeof client.navigate === "function") {
                        try {
                            await client.navigate(targetUrl);
                            return;
                        } catch {
                            // fall through to openWindow
                        }
                    }
                    // Same-origin client: post path for app router if navigate unavailable.
                    client.postMessage({ type: "clique-notification-navigate", path });
                    return;
                }
            }

            if (self.clients.openWindow) {
                await self.clients.openWindow(targetUrl);
            }
        })(),
    );
});
