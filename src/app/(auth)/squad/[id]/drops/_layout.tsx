import { Stack } from 'expo-router';

/**
 * Drops Stack — all detail screens use custom ScreenHeader, so
 * the native header is disabled everywhere to avoid double headers.
 */
export default function DropsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new" />
            <Stack.Screen name="[dropId]" />
        </Stack>
    );
}
