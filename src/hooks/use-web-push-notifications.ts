import { api } from '@/convex/_generated/api';
import { getMyDeviceId } from '@/lib/keyStore';
import {
    isStandalonePwa,
    isWebPushSupported,
    registerWebPush,
} from '@/lib/webPush';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';
import type { WebPushStatus } from '@/lib/webPush';

type WebPushHookResult = {
    /** true when this browser can do Web Push */
    supported: boolean;
    /** true when running as an installed PWA (needed for iOS) */
    standalone: boolean;
    status: WebPushStatus;
    /** call from a button press (user gesture) */
    enable: () => Promise<void>;
    /** reset local state (used after a permission change / disable) */
    refresh: () => Promise<void>;
};

/**
 * Web-only push registration.
 * Does **not** import expo-notifications — browser Notification + PushManager only.
 *
 * Permission is requested inside a user gesture via `enable()` (iOS Safari
 * requirement). On mount we only reflect current permission / subscription.
 */
export function useWebPushNotifications(enabled = true): WebPushHookResult {
    const registerWebPushSubscription = useMutation(api.push.registerWebPushSubscription);
    const [supported] = useState<boolean>(() => isWebPushSupported());
    const [standalone] = useState<boolean>(() => isStandalonePwa());
    const [status, setStatus] = useState<WebPushStatus>({ state: 'idle' });

    const refresh = useCallback(async () => {
        if (!supported) {
            setStatus({ state: 'unsupported' });
            return;
        }
        if (Notification.permission === 'granted') {
            setStatus({ state: 'idle' });
        } else if (Notification.permission === 'denied') {
            setStatus({ state: 'denied' });
        } else {
            setStatus({ state: 'idle' });
        }
    }, [supported]);

    const enable = useCallback(async () => {
        if (!supported) {
            setStatus({ state: 'unsupported' });
            return;
        }
        setStatus({ state: 'requesting' });
        const result = await registerWebPush(registerWebPushSubscription);
        setStatus(result);
    }, [supported, registerWebPushSubscription]);

    useEffect(() => {
        if (!enabled) return;
        void refresh();

        // SW signals a rotated push subscription (pushsubscriptionchange).
        // Best-effort: persist the fresh endpoint so delivery keeps working.
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (
                data
                && typeof data === 'object'
                && data.type === 'clique-pushsubscriptionchange'
                && data.subscription
                && typeof data.subscription.endpoint === 'string'
                && typeof data.subscription.p256dh === 'string'
                && typeof data.subscription.auth === 'string'
            ) {
                void (async () => {
                    try {
                        const deviceId = await getMyDeviceId();
                        await registerWebPushSubscription({
                            deviceId,
                            endpoint: data.subscription.endpoint,
                            p256dh: data.subscription.p256dh,
                            auth: data.subscription.auth,
                        });
                        console.info('[Web Push] refreshed subscription after pushsubscriptionchange.');
                    } catch (error) {
                        console.warn('[Web Push] failed to refresh rotated subscription', error);
                    }
                })();
            }
        };
        navigator.serviceWorker?.addEventListener('message', onMessage);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', onMessage);
        };
    }, [enabled, refresh, registerWebPushSubscription]);

    return { supported, standalone, status, enable, refresh };
}
