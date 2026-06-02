import { Stack } from 'expo-router';

import { JournalKeyContext, useJournalKeyProvider } from '@/hooks/use-journal-key';

/**
 * Notes Stack — all detail screens use custom ScreenHeader, so
 * the native header is disabled everywhere to avoid double headers.
 *
 * JournalKeyContext is provided here so all notes screens share a single
 * key derivation instance (one SecureStore read, one Convex subscription).
 */
export default function NotesLayout() {
    const journalKey = useJournalKeyProvider();

    return (
        <JournalKeyContext.Provider value={journalKey}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="new" />
                <Stack.Screen name="journals" />
                <Stack.Screen name="[noteId]" />
            </Stack>
        </JournalKeyContext.Provider>
    );
}
