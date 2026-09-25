import { api } from '@/convex/_generated/api';
import { getMyDeviceId } from '@/lib/keyStore';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

type ExpoNotifications = typeof import('expo-notifications');

type PushRegistrationStage =
    | 'notifications_import'
    | 'not_physical_device'
    | 'permission_denied'
    | 'missing_project_id'
    | 'token_request'
    | 'missing_device_id'
    | 'register_token'
    | 'saved';

let notificationHandlerConfigured = false;
let lastDebugAlertKey: string | null = null;

const ANDROID_NOTIFICATION_CHANNELS = [
    {
        id: 'default',
        name: 'General activity',
        importance: 'default',
    },
    {
        id: 'messages',
        name: 'Messages',
        importance: 'default',
    },
    {
        id: 'direct',
        name: 'Direct messages',
        importance: 'high',
    },
    {
        id: 'replies',
        name: 'Replies',
        importance: 'high',
    },
    {
        id: 'social',
        name: 'Social activity',
        importance: 'low',
    },
    {
        id: 'calls',
        name: 'Calls',
        importance: 'high',
    },
] as const;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function isPushDebugEnabled() {
    return Constants.expoConfig?.extra?.debugPushRegistration === true;
}

function showDebugAlert(stage: PushRegistrationStage, message: string) {
    if (!isPushDebugEnabled()) return;

    const key = `${stage}:${message}`;
    if (lastDebugAlertKey === key) return;
    lastDebugAlertKey = key;
    Alert.alert('Push registration', `${stage}: ${message}`);
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
    try {
        return await import('expo-notifications');
    } catch (error) {
        console.warn('Push notifications require a development or production build on Android.', error);
        return null;
    }
}

function configureNotificationHandler(Notifications: ExpoNotifications) {
    if (notificationHandlerConfigured) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    notificationHandlerConfigured = true;
}

function toAndroidImportance(
    Notifications: ExpoNotifications,
    importance: (typeof ANDROID_NOTIFICATION_CHANNELS)[number]['importance'],
) {
    switch (importance) {
        case 'high':
            return Notifications.AndroidImportance.HIGH;
        case 'low':
            return Notifications.AndroidImportance.LOW;
        default:
            return Notifications.AndroidImportance.DEFAULT;
    }
}

async function configureAndroidChannels(Notifications: ExpoNotifications) {
    await Promise.all(
        ANDROID_NOTIFICATION_CHANNELS.map((channel) =>
            Notifications.setNotificationChannelAsync(channel.id, {
                name: channel.name,
                importance: toAndroidImportance(Notifications, channel.importance),
            })
        )
    );
}

function getProjectId() {
    const projectId = Constants.easConfig?.projectId
        ?? Constants.expoConfig?.extra?.eas?.projectId;
    return typeof projectId === 'string' ? projectId : undefined;
}

export function usePushNotifications(enabled = true) {
    const registerToken = useMutation(api.push.registerToken);
    const reportRegistrationIssue = useMutation(api.push.reportRegistrationIssue);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        async function report(stage: PushRegistrationStage, message: string) {
            const safeMessage = message.slice(0, 500);
            console.warn(`[Push registration] ${stage}: ${safeMessage}`);
            showDebugAlert(stage, safeMessage);
            try {
                await reportRegistrationIssue({ stage, message: safeMessage });
            } catch (error) {
                console.warn('Failed to report push registration issue', error);
            }
        }

        async function registerForPushNotifications() {
            const Notifications = await loadNotifications();
            if (!Notifications) {
                await report('notifications_import', 'expo-notifications is unavailable in this runtime. Use an EAS development/preview/production build, not Expo Go.');
                return;
            }
            configureNotificationHandler(Notifications);

            if (!Device.isDevice) {
                await report('not_physical_device', 'Expo push tokens are only issued on a physical device.');
                return;
            }

            if (Platform.OS === 'android') {
                await configureAndroidChannels(Notifications);
            }

            const existingPermission = await Notifications.getPermissionsAsync();
            let finalStatus = existingPermission.status;

            if (finalStatus !== 'granted') {
                const requestedPermission = await Notifications.requestPermissionsAsync();
                finalStatus = requestedPermission.status;
            }

            if (finalStatus !== 'granted') {
                await report('permission_denied', `Notification permission is ${finalStatus}. Enable notifications for Clique in Android settings.`);
                return;
            }
            if (cancelled) return;

            const projectId = getProjectId();
            if (!projectId) {
                await report('missing_project_id', 'Missing Expo EAS projectId in runtime constants.');
                return;
            }

            let pushToken: string;
            try {
                pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            } catch (error) {
                await report('token_request', getErrorMessage(error));
                return;
            }

            let deviceId: string;
            try {
                deviceId = await getMyDeviceId();
            } catch (error) {
                await report('missing_device_id', getErrorMessage(error));
                return;
            }

            if (cancelled) return;

            try {
                await registerToken({
                    deviceId,
                    pushToken,
                });
                console.info('[Push registration] saved token for current device.');
                showDebugAlert('saved', 'Push token registered for this device.');
            } catch (error) {
                await report('register_token', getErrorMessage(error));
            }
        }

        registerForPushNotifications().catch((error) => {
            console.warn('Push notification registration failed', error);
        });

        return () => {
            cancelled = true;
        };
    }, [enabled, registerToken, reportRegistrationIssue]);
}
