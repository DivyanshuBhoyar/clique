import { getMyDeviceId } from '@/lib/keyStore';
import Constants from 'expo-constants';

export const WEB_PUSH_SERVICE_WORKER_PATH = '/push-sw.js';

export type WebPushStatus =
    | { state: 'unsupported' }
    | { state: 'insecure_context' }
    | { state: 'missing_vapid_key' }
    | { state: 'idle' }
    | { state: 'requesting' }
    | { state: 'denied' }
    | { state: 'subscribed'; endpoint: string }
    | { state: 'error'; message: string };

type RegisterWebPushMutation = (args: {
    deviceId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}) => Promise<{ saved: boolean }>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export function isWebPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        'Notification' in window
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && window.isSecureContext === true
    );
}

export function isStandalonePwa(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches
        || (navigator as { standalone?: boolean }).standalone === true
    );
}

export function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
}

export function getVapidPublicKey() {
    const fromExtra = Constants.expoConfig?.extra?.webPushVapidPublicKey;
    if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
    const fromEnv = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : undefined;
}

/** base64url VAPID key → Uint8Array for applicationServerKey */
export function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = globalThis.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Browser Web Push registration. Must be called from a **user gesture**
 * (tap handler) — required by iOS Safari and best practice on desktop.
 */
export async function registerWebPush(
    registerWebPushSubscription: RegisterWebPushMutation,
): Promise<WebPushStatus> {
    if (!isWebPushSupported()) {
        return { state: 'unsupported' };
    }

    const vapidPublicKey = getVapidPublicKey();
    if (!vapidPublicKey) {
        return { state: 'missing_vapid_key' };
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
        return { state: 'denied' };
    }

    let registration: ServiceWorkerRegistration;
    try {
        registration = await navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_PATH, {
            scope: '/',
        });
        await navigator.serviceWorker.ready;
    } catch (error) {
        return { state: 'error', message: getErrorMessage(error) };
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
        return { state: 'error', message: getErrorMessage(error) };
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
        return { state: 'error', message: 'PushSubscription missing endpoint or keys.' };
    }

    let deviceId: string;
    try {
        deviceId = await getMyDeviceId();
    } catch (error) {
        return { state: 'error', message: getErrorMessage(error) };
    }

    try {
        await registerWebPushSubscription({ deviceId, endpoint, p256dh, auth });
    } catch (error) {
        return { state: 'error', message: getErrorMessage(error) };
    }

    return { state: 'subscribed', endpoint };
}
