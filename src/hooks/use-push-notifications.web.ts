import { api } from '@/convex/_generated/api';
import { getMyDeviceId } from '@/lib/keyStore';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import { useCallback, useEffect } from 'react';
import { create } from 'zustand';

const SERVICE_WORKER_PATH = '/push-sw.js';

export type WebPushStatus =
    | 'idle'
    | 'loading'
    | 'unsupported'
    | 'not-installed'
    | 'prompt'
    | 'blocked'
    | 'subscribed';

type WebPushRegistrationStage =
    | 'unsupported'
    | 'insecure_context'
    | 'missing_vapid_public_key'
    | 'permission_denied'
    | 'sw_register'
    | 'subscribe'
    | 'missing_device_id'
    | 'register_subscription'
    | 'saved';

type RegisterWebPushSubscription = (
    args: { deviceId: string; endpoint: string; p256dh: string; auth: string },
) => Promise<unknown>;
type ReportStage =
    | 'notifications_import'
    | 'not_physical_device'
    | 'permission_denied'
    | 'missing_project_id'
    | 'token_request'
    | 'missing_device_id'
    | 'register_token'
    | 'saved';
type ReportRegistrationIssue = (args: { stage: ReportStage; message: string }) => Promise<unknown>;

type WebPushStoreState = {
    status: WebPushStatus;
    setStatus: (status: WebPushStatus) => void;
};

const useWebPushStore = create<WebPushStoreState>((set) => ({
    status: 'idle',
    setStatus: (status) => set({ status }),
}));

let initStarted = false;
let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function getVapidPublicKey() {
    const fromExtra = Constants.expoConfig?.extra?.webPushVapidPublicKey;
    if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
    const fromEnv = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : undefined;
}

/** base64url VAPID key → Uint8Array for applicationServerKey */
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = globalThis.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function ensureServiceWorker() {
    if (!swRegistrationPromise) {
        swRegistrationPromise = navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
            scope: '/',
        });
    }
    return swRegistrationPromise;
}

/**
 * iOS exposes Push APIs only inside an installed Home Screen web app, so a
 * missing-API iPhone/iPad means "install first" rather than "never supported".
 */
function detectSupport(): 'ok' | 'insecure' | 'unsupported' | 'not-installed' {
    if (typeof window === 'undefined' || !window.isSecureContext) return 'insecure';
    const hasApis = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    if (hasApis) return 'ok';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOS ? 'not-installed' : 'unsupported';
}

async function reportIssue(
    reportRegistrationIssue: ReportRegistrationIssue,
    stage: WebPushRegistrationStage,
    message: string,
) {
    const safeMessage = message.slice(0, 500);
    console.warn(`[Web Push registration] ${stage}: ${safeMessage}`);
    try {
        // Reuse native stage union loosely — map unknown stages to token_request-ish labels.
        const mappedStage =
            stage === 'permission_denied'
                ? 'permission_denied'
                : stage === 'missing_device_id'
                    ? 'missing_device_id'
                    : stage === 'saved'
                        ? 'saved'
                        : stage === 'missing_vapid_public_key'
                            ? 'missing_project_id'
                            : 'token_request';
        await reportRegistrationIssue({ stage: mappedStage, message: `[web:${stage}] ${safeMessage}` });
    } catch (error) {
        console.warn('Failed to report web push registration issue', error);
    }
}

async function subscribeAndSave(
    vapidPublicKey: string,
    registerWebPushSubscription: RegisterWebPushSubscription,
    reportRegistrationIssue: ReportRegistrationIssue,
): Promise<boolean> {
    let registration: ServiceWorkerRegistration;
    try {
        registration = await ensureServiceWorker();
        await navigator.serviceWorker.ready;
    } catch (error) {
        await reportIssue(reportRegistrationIssue, 'sw_register', getErrorMessage(error));
        return false;
    }

    let subscription: PushSubscription | null = null;
    try {
        subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
        }
    } catch (error) {
        await reportIssue(reportRegistrationIssue, 'subscribe', getErrorMessage(error));
        return false;
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
        await reportIssue(reportRegistrationIssue, 'subscribe', 'PushSubscription missing endpoint or keys.');
        return false;
    }

    let deviceId: string;
    try {
        deviceId = await getMyDeviceId();
    } catch (error) {
        await reportIssue(reportRegistrationIssue, 'missing_device_id', getErrorMessage(error));
        return false;
    }

    try {
        await registerWebPushSubscription({ deviceId, endpoint, p256dh, auth });
        return true;
    } catch (error) {
        await reportIssue(reportRegistrationIssue, 'register_subscription', getErrorMessage(error));
        return false;
    }
}

/**
 * Web-only push registration. Does **not** import expo-notifications.
 * Mount-time work is silent: service worker + existing-subscription check only.
 * Permission is requested exclusively through {@link useWebPush}.enable(),
 * which must be invoked directly from a user-gesture handler (transient activation).
 */
export function usePushNotifications(enabled = true) {
    const registerWebPushSubscription = useMutation(api.push.registerWebPushSubscription);
    const reportRegistrationIssue = useMutation(api.push.reportRegistrationIssue);
    const setStatus = useWebPushStore((s) => s.setStatus);

    useEffect(() => {
        if (!enabled) return;
        if (typeof window === 'undefined') return;
        if (initStarted) return;
        initStarted = true;

        void (async () => {
            const support = detectSupport();
            if (support === 'not-installed') {
                setStatus('not-installed');
                return;
            }
            if (support !== 'ok') {
                setStatus('unsupported');
                if (support === 'insecure') {
                    await reportIssue(reportRegistrationIssue, 'insecure_context', 'Web Push requires HTTPS (or localhost).');
                } else {
                    await reportIssue(reportRegistrationIssue, 'unsupported', 'This browser does not support Web Push.');
                }
                return;
            }

            const vapidPublicKey = getVapidPublicKey();
            if (!vapidPublicKey) {
                setStatus('unsupported');
                await reportIssue(
                    reportRegistrationIssue,
                    'missing_vapid_public_key',
                    'Set EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY (and matching Convex WEB_PUSH_VAPID_* secrets).',
                );
                return;
            }

            if (Notification.permission === 'denied') {
                setStatus('blocked');
                await reportIssue(reportRegistrationIssue, 'permission_denied', 'Notification permission was previously denied.');
                return;
            }

            if (Notification.permission === 'granted') {
                setStatus('loading');
                const ok = await subscribeAndSave(vapidPublicKey, registerWebPushSubscription, reportRegistrationIssue);
                setStatus(ok ? 'subscribed' : 'prompt');
                if (ok) console.info('[Web Push registration] saved subscription for current device.');
                return;
            }

            setStatus('prompt');
        })().catch((error) => {
            console.warn('Web Push initialization failed', error);
            setStatus('prompt');
        });

        // Deep-link from SW when an existing tab is focused.
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (
                data
                && typeof data === 'object'
                && data.type === 'clique-notification-navigate'
                && typeof data.path === 'string'
                && data.path.length > 0
            ) {
                if (window.location.pathname !== data.path) {
                    window.location.assign(data.path);
                }
            }
        };
        navigator.serviceWorker?.addEventListener('message', onMessage);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', onMessage);
        };
    }, [enabled, registerWebPushSubscription, reportRegistrationIssue, setStatus]);
}

/** Consumer view of web push state for banner + settings surfaces. */
export function useWebPush() {
    const status = useWebPushStore((s) => s.status);
    const registerWebPushSubscription = useMutation(api.push.registerWebPushSubscription);
    const reportRegistrationIssue = useMutation(api.push.reportRegistrationIssue);
    const setStatus = useWebPushStore((s) => s.setStatus);

    const enable = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !('Notification' in window)) return false;

        // Transient activation: requestPermission must be entered before any await.
        const permission = Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;

        if (permission !== 'granted') {
            setStatus(permission === 'denied' ? 'blocked' : 'prompt');
            if (permission === 'denied') {
                await reportIssue(reportRegistrationIssue, 'permission_denied', 'User denied notification permission.');
            }
            return false;
        }

        setStatus('loading');
        const vapidPublicKey = getVapidPublicKey();
        if (!vapidPublicKey) {
            setStatus('prompt');
            await reportIssue(
                reportRegistrationIssue,
                'missing_vapid_public_key',
                'Set EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY (and matching Convex WEB_PUSH_VAPID_* secrets).',
            );
            return false;
        }

        const ok = await subscribeAndSave(vapidPublicKey, registerWebPushSubscription, reportRegistrationIssue);
        setStatus(ok ? 'subscribed' : 'prompt');
        return ok;
    }, [registerWebPushSubscription, reportRegistrationIssue, setStatus]);

    return { status, enable };
}
