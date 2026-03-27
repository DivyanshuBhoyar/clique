import { useConvexAuth, useQuery } from 'convex/react';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { api } from '../../../convex/_generated/api';

export default function PublicLayout() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const currentUser = useQuery(
        api.auth.users.getCurrentUser,
        isAuthenticated ? {} : "skip"
    );

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // If authenticated, check if user has a username
    if (isAuthenticated) {
        // Still loading user data
        if (currentUser === undefined) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }

        // User has no record yet or no username — send to set-username
        if (currentUser === null || !currentUser.username) {
            return <Redirect href={"/(public)/set-username" as any} />;
        } else {
            return <Redirect href={"/(auth)" as any} />;
        }
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="set-username" />
        </Stack>
    );
}
