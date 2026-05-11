import { Stack } from 'expo-router';

/**
 * Notes Stack — all detail screens use custom ScreenHeader, so
 * the native header is disabled everywhere to avoid double headers.
 */
export default function NotesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new" />
            <Stack.Screen name="journals" />
            <Stack.Screen name="[noteId]" />
        </Stack>
    );
}
