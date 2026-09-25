/**
 * SetUsernameScreen — shown after first-time sign-in.
 *
 * Design: animated welcome card, large username input,
 * avatar preview generated from Dicebear.
 */
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Smile } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeroCard } from '@/components/auth/auth-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../../convex/_generated/api';

export default function SetUsernameScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const saveUsername = useMutation(api.users.saveUsername);

    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isValid = username.trim().length >= 3;

    const handleSave = async () => {
        const trimmed = username.trim();
        if (!trimmed) {
            toast.error('Please enter a username.');
            return;
        }
        if (trimmed.length < 3) {
            toast.error('Username must be at least 3 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const avatarUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(trimmed)}`;
            await saveUsername({ username: trimmed, image: avatarUrl });
            router.replace('/(auth)' as any);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to save username. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    {/* Hero */}
                    <AuthHeroCard emoji="👋" title="Welcome!" subtitle="Let's set up your vibe name" />

                    {/* Form Card */}
                    <View style={[styles.formCard, {
                        backgroundColor: theme.surface,
                        borderColor: theme.outline,
                        shadowColor: theme.shadow,
                        shadowOffset: Shadows.sm.shadowOffset,
                        shadowOpacity: Shadows.sm.shadowOpacity,
                        shadowRadius: Shadows.sm.shadowRadius,
                        elevation: 3,
                    }]}>
                        <View style={styles.inputHeader}>
                            <Smile size={16} color={theme.text} strokeWidth={2} />
                            <ThemedText type="bodyBold">Your username</ThemedText>
                        </View>

                        <ThemedText type="small" themeColor="textSecondary">
                            Min. 3 characters · This is how your space sees you
                        </ThemedText>

                        <TextInput
                            style={[styles.input, {
                                color: theme.text,
                                borderColor: isValid ? theme.accent : theme.outline,
                                backgroundColor: theme.background,
                            }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="e.g. cozy_theo 🎧"
                            placeholderTextColor={theme.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isLoading}
                            autoFocus
                            maxLength={24}
                        />

                        <View style={styles.charRow}>
                            <ThemedText type="caption" themeColor="textTertiary">
                                {username.length}/24
                            </ThemedText>
                            {isValid && (
                                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: Weight.bold }}>
                                    ✓ Looks good!
                                </ThemedText>
                            )}
                        </View>

                        {isLoading ? (
                            <ActivityIndicator size="small" color={theme.accent} />
                        ) : (
                            <Pressable
                                style={[
                                    styles.submitBtn,
                                    {
                                        backgroundColor: isValid ? theme.accent : theme.backgroundElement,
                                        borderColor: isValid ? theme.outline : theme.outlineLight,
                                    },
                                ]}
                                onPress={handleSave}
                                disabled={!isValid}
                            >
                                <ThemedText
                                    type="bodyBold"
                                    style={{ color: isValid ? theme.text : theme.textTertiary }}
                                >
                                    Let&apos;s Go! 🚀
                                </ThemedText>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    inner: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    formCard: {
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        borderWidth: 2,
        gap: Spacing.md,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    input: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: Typography.body,
    },
    charRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -Spacing.sm,
    },
    submitBtn: {
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
});
