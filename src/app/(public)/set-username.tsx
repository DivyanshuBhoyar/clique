import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';

export default function SetUsernameScreen() {
    const router = useRouter();
    const theme = useTheme();
    const saveUsername = useMutation(api.users.saveUsername);

    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        const trimmed = username.trim();
        if (!trimmed) {
            Alert.alert('Error', 'Please enter a username.');
            return;
        }
        if (trimmed.length < 3) {
            Alert.alert('Error', 'Username must be at least 3 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const avatarUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(trimmed)}`;
            await saveUsername({ username: trimmed, image: avatarUrl });
            router.replace('/(auth)' as any);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Failed to save username. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.heroSection, {
                    backgroundColor: theme.accentSoft,
                    borderColor: theme.outline,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.offset,
                    shadowOpacity: Shadows.sm.opacity,
                    shadowRadius: Shadows.sm.radius,
                }]}>
                    <ThemedText type="title" style={{ textAlign: 'center' }}>
                        Welcome!
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.sm }}>
                        What should we call you?
                    </ThemedText>
                </View>

                <View style={styles.formSection}>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Pick a username"
                        placeholderTextColor={theme.textTertiary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />

                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                        <Button title="Let's Go!" color={theme.accent} onPress={handleSave} />
                    )}
                </View>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: Spacing.huge,
        paddingVertical: Spacing.xxl,
        borderRadius: Radius.lg,
        borderWidth: 2,
    },
    formSection: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.lg,
    },
    input: {
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        fontSize: 18,
        textAlign: 'center',
    },
});
