import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useAppNotificationPresenceHeartbeat } from '@/hooks/use-notification-presence-heartbeat';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { initDevice } from '@/lib/keyStore';
import { initLocalDb } from '@/lib/local-db';
import { useConvexAuth, useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
                initDevice(registerDevice),
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
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const path = response.notification.request.content.data?.path;
            if (typeof path === 'string' && path.length > 0) {
                router.push(path as any);
            }
        });

        return () => sub.remove();
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
