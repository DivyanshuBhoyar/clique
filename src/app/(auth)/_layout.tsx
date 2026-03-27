import { useConvexAuth } from 'convex/react';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
    const { isLoading, isAuthenticated } = useConvexAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
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
        </Stack>
    );
}
