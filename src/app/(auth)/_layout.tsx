import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useAppNotificationPresenceHeartbeat } from '@/hooks/use-notification-presence-heartbeat';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { initDevice } from '@/lib/keyStore';
import { initLocalDb } from '@/lib/local-db';
import { useConvexAuth, useMutation } from 'convex/react';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

export default function AuthLayout() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const router = useRouter();
    const [isDeviceReady, setIsDeviceReady] = useState(false);

    const registerDevice = useMutation(api.deviceKeys.registerDevice);

    useEffect(() => {
        if (isLoading || !isAuthenticated) {
            setIsDeviceReady(false);
            return;
        }

        let cancelled = false;
        setIsDeviceReady(false);

        async function initAuthenticatedDevice() {
            await Promise.all([
                initLocalDb().catch(console.error),
                // Non-fatal: a failed device registration (e.g. MAX_DEVICES_REACHED)
                // must not block isDeviceReady — the push notification permission
                // prompt and token registration run independently afterward.
                initDevice(registerDevice).catch(console.error),
            ]);
            if (!cancelled) setIsDeviceReady(true);
        }

        initAuthenticatedDevice().catch(console.error);

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isLoading, registerDevice]);

    usePushNotifications(isAuthenticated && isDeviceReady);
    useAppNotificationPresenceHeartbeat(isAuthenticated);

    useEffect(() => {
        // Native-only: expo-notifications is not used on web (see use-push-notifications.web.ts + push-sw.js).
        if (process.env.EXPO_OS === 'web' || Platform.OS === 'web') return;

        let subscription: { remove: () => void } | null = null;
        let cancelled = false;

        async function listenForNotificationTaps() {
            try {
                const Notifications = await import('expo-notifications');
                if (cancelled) return;
                subscription = Notifications.addNotificationResponseReceivedListener((response) => {
                    const path = response.notification.request.content.data?.path;
                    if (typeof path === 'string' && path.length > 0) {
                        router.push(path as any);
                    }
                });
            } catch (error) {
                console.warn('Notification tap handling requires a development or production build on Android.', error);
            }
        }

        void listenForNotificationTaps();

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, [router]);


    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.light.accent} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href={"/(public)/sign-in" as any} />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="create-squad" />
            <Stack.Screen name="squad/[id]" />
            <Stack.Screen name="dm" />
        </Stack>
    );
}
