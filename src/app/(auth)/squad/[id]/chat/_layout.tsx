import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

const screenOptions = {
    headerShown: true,
    headerTitleStyle: { fontSize: Typography.small, fontWeight: '600' as const, color: Colors.light.headerTintColor },
    headerTintColor: Colors.light.headerTintColor,
    headerStyle: { backgroundColor: Colors.light.headerBackground },
    headerShadowVisible: false,
    headerBackTitle: '',
};

export default function ChatLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="[channelId]" options={screenOptions} />
        </Stack>
    );
}
