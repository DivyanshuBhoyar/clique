import { Stack } from 'expo-router';

export default function MemoriesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="[memoryId]" />
        </Stack>
    );
}
