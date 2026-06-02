import { api } from '@/convex/_generated/api';
import { getMyDeviceId } from '@/lib/keyStore';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

function getProjectId() {
    return Constants.easConfig?.projectId
        ?? Constants.expoConfig?.extra?.eas?.projectId;
}

export function usePushNotifications(enabled = true) {
    const registerToken = useMutation(api.push.registerToken);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        async function registerForPushNotifications() {
            if (!Device.isDevice) return;

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                });
            }

            const existingPermission = await Notifications.getPermissionsAsync();
            let finalStatus = existingPermission.status;

            if (finalStatus !== 'granted') {
                const requestedPermission = await Notifications.requestPermissionsAsync();
                finalStatus = requestedPermission.status;
            }

            if (finalStatus !== 'granted' || cancelled) return;

            const projectId = getProjectId();
            if (!projectId) {
                console.warn('Missing Expo projectId; push token registration skipped.');
                return;
            }

            const [{ data: pushToken }, deviceId] = await Promise.all([
                Notifications.getExpoPushTokenAsync({ projectId }),
                getMyDeviceId(),
            ]);

            if (cancelled) return;

            await registerToken({
                deviceId,
                pushToken,
            });
        }

        registerForPushNotifications().catch((error) => {
            console.warn('Push notification registration failed', error);
        });

        return () => {
            cancelled = true;
        };
    }, [enabled, registerToken]);
}
