import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { backOrReplace } from '@/utils/navigation';
import { api } from '../../../convex/_generated/api';

const NAME_LIMIT = 32;
const TAG_LIMIT = 60;

export default function CreateSquadScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const createSquad = useMutation(api.squad.createSquad);

    const canSubmit = name.trim().length > 0 && password.trim().length > 0 && nickname.trim().length > 0 && !isSubmitting;

    const handleCreate = async () => {
        if (!name.trim() || !password.trim() || !nickname.trim()) {
            return;
        }
        setIsSubmitting(true);
        try {
            const squadId = await createSquad({ name: name.trim(), password: password.trim(), nickname: nickname.trim() });
            toast.success('Squad created!');
            router.replace(`/squad/${squadId}/chat` as any);
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to create squad');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScreenHeader title="Create Squad 🏠" onBack={() => backOrReplace(router, '/')} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.avatarWrapper}>
                            <View style={[styles.avatarBox, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
                                <ThemedText style={styles.avatarEmoji}>🏠</ThemedText>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary">
                                Add squad photo or emoji
                            </ThemedText>
                        </View>

                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            <View style={styles.fieldHeader}>
                                <ThemedText type="smallBold">
                                    Squad Name <ThemedText style={{ color: theme.error }}>*</ThemedText>
                                </ThemedText>
                                <ThemedText type="caption" themeColor="textTertiary">
                                    {name.length}/{NAME_LIMIT}
                                </ThemedText>
                            </View>
                            <TextInput
                                style={[styles.fieldInput, { color: theme.text }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. The Cove"
                                placeholderTextColor={theme.placeholder}
                                maxLength={NAME_LIMIT}
                                autoFocus
                            />
                        </View>

                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            <ThemedText type="smallBold">Tagline</ThemedText>
                            <TextInput
                                style={[styles.fieldInput, { color: theme.text }]}
                                value={tagline}
                                onChangeText={setTagline}
                                placeholder="A short vibe description… optional"
                                placeholderTextColor={theme.placeholder}
                                maxLength={TAG_LIMIT}
                            />
                        </View>

                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            <View style={styles.fieldHeader}>
                                <View style={styles.fieldHeaderLeft}>
                                    <Lock size={13} color={theme.textSecondary} strokeWidth={2} />
                                    <ThemedText type="smallBold">
                                        Squad Password <ThemedText style={{ color: theme.error }}>*</ThemedText>
                                    </ThemedText>
                                </View>
                            </View>
                            <TextInput
                                style={[styles.fieldInput, { color: theme.text }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Friends need this to join"
                                placeholderTextColor={theme.placeholder}
                                secureTextEntry
                            />
                        </View>

                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            <ThemedText type="smallBold">
                                Your Nickname <ThemedText style={{ color: theme.error }}>*</ThemedText>
                            </ThemedText>
                            <TextInput
                                style={[styles.fieldInput, { color: theme.text }]}
                                value={nickname}
                                onChangeText={setNickname}
                                placeholder="What should we call you?"
                                placeholderTextColor={theme.placeholder}
                                maxLength={24}
                            />
                        </View>

                        <Pressable
                            style={[
                                styles.createBtn,
                                {
                                    backgroundColor: canSubmit ? theme.accent : theme.backgroundElement,
                                    borderColor: canSubmit ? theme.outline : theme.outlineLight,
                                },
                            ]}
                            onPress={handleCreate}
                            disabled={!canSubmit}
                        >
                            <ThemedText
                                type="bodyBold"
                                style={[
                                    styles.createBtnText,
                                    { color: canSubmit ? theme.text : theme.textTertiary },
                                ]}
                            >
                                {isSubmitting ? 'Creating…' : 'Create Squad 🎉'}
                            </ThemedText>
                        </Pressable>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: 40,
        gap: Spacing.md,
    },
    avatarWrapper: {
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    avatarBox: {
        width: 88,
        height: 88,
        borderRadius: Radius.xl,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEmoji: { fontSize: Typography.display },
    card: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.xs,
    },
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fieldHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    fieldInput: {
        fontSize: Typography.body,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 0,
    },
    createBtn: {
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    createBtnText: {
        fontSize: Typography.body,
    },
});
