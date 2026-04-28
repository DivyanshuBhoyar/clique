import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

const detailOptions = {
    headerShown: true,
    headerTitleStyle: { fontSize: Typography.small, fontWeight: '600' as const, color: Colors.light.headerTintColor },
    headerTintColor: Colors.light.headerTintColor,
    headerStyle: { backgroundColor: Colors.light.headerBackground },
    headerShadowVisible: false,
    headerBackTitle: '',
};

export default function NotesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new" options={{ ...detailOptions, headerTitle: 'New Note' }} />
            <Stack.Screen name="journals" options={{ ...detailOptions, headerTitle: 'Past Journals' }} />
            <Stack.Screen name="[noteId]" options={{ ...detailOptions, headerTitle: 'Note' }} />
        </Stack>
    );
}
