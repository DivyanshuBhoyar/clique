import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { initDevice } from '@/lib/keyStore';
import { initLocalDb } from '@/lib/local-db';
import { useConvexAuth, useMutation } from 'convex/react';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
    const { isLoading, isAuthenticated } = useConvexAuth();

    const registerDevice = useMutation(api.deviceKeys.registerDevice);

    useEffect(() => {
        if (isLoading || !isAuthenticated) return;

        initLocalDb().catch(console.error);
        initDevice(registerDevice).catch(console.error);
    }, [isAuthenticated, isLoading, registerDevice]);


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
