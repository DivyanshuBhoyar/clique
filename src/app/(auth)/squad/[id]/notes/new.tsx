import { useMutation } from 'convex/react';
import { router, useGlobalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useTheme } from '@/hooks/use-theme';

export default function NewNoteScreen() {
    const theme = useTheme();
    const { id, type } = useGlobalSearchParams<{ id: string; type?: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const isShared = type === "shared";

    const [title, setTitle] = useState("");
    const [tag, setTag] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);

    const createNote = useMutation(api.notes.createNote);

    const canCreate = (title.trim().length > 0 || content.trim().length > 0) && !saving;

    const handleCreate = useCallback(async () => {
        if (!squadId || !canCreate) return;
        setSaving(true);

        try {
            const noteId = await createNote({
                squadId,
                title: title.trim() || "Untitled",
                content: content.trim(),
                type: isShared ? "shared" : "personal",
                tag: tag.trim() || undefined,
            });
            router.replace(`/squad/${squadId}/notes/${noteId}`);
        } catch {
            setSaving(false);
        }
    }, [squadId, title, tag, content, createNote, isShared, canCreate]);

    const { height: keyboardHeight } = useKeyboardHeight();

    const spacerStyle = useAnimatedStyle(() => ({
        height: Math.abs(keyboardHeight.value),
    }));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={[]}>
            <ScreenHeader
                title={isShared ? 'New Shared Note 🤝' : 'New Note 📝'}
                onBack={() => router.back()}
            />
            <KeyboardAwareScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                bottomOffset={80}
            >
                <View style={[styles.typeBadge, {
                    backgroundColor: isShared ? theme.accentSoft : theme.accent,
                    borderColor: theme.outline,
                    borderRadius: Radius.full,
                }]}>
                    <ThemedText type="smallBold" style={{ color: isShared ? theme.accent : theme.text, fontSize: Typography.caption }}>
                        {isShared ? '🤝 Shared' : '🔒 Personal'}
                    </ThemedText>
                </View>

                <TextInput
                    style={styles.titleInput}
                    placeholder="Title"
                    placeholderTextColor={theme.placeholder}
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                    returnKeyType="next"
                />

                <TextInput
                    style={[styles.tagInput, { borderBottomColor: theme.outlineLight }]}
                    placeholder="Tag (optional)"
                    placeholderTextColor={theme.placeholder}
                    value={tag}
                    onChangeText={setTag}
                    returnKeyType="next"
                />

                <TextInput
                    style={styles.contentInput}
                    placeholder="Start writing..."
                    placeholderTextColor={theme.placeholder}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                />
            </KeyboardAwareScrollView>

            <View style={[styles.buttonWrap, { borderTopColor: theme.outlineLight }]}>
                <Pressable
                    onPress={handleCreate}
                    style={[styles.createButton, {
                        backgroundColor: canCreate ? theme.accent : theme.backgroundElement,
                        borderRadius: Radius.full,
                        borderWidth: 2,
                        borderColor: canCreate ? theme.outline : theme.outlineLight,
                    }, !canCreate && styles.createButtonDisabled]}
                    disabled={!canCreate}
                >
                    <ThemedText style={[styles.createButtonText, { color: canCreate ? theme.text : theme.textTertiary }]}>
                        {saving ? 'Creating…' : 'Create Note'}
                    </ThemedText>
                </Pressable>
            </View>

            <Animated.View style={spacerStyle} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: {
        padding: Spacing.lg,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderWidth: 1.5,
        marginBottom: Spacing.lg,
    },
    titleInput: {
        fontSize: Typography.subtitle,
        fontWeight: Weight.bold,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    tagInput: {
        fontSize: Typography.small,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.lg,
        borderBottomWidth: 1,
    },
    contentInput: {
        minHeight: 200,
        fontSize: Typography.body,
        lineHeight: LineHeight.body,
        textAlignVertical: 'top',
    },
    buttonWrap: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
    },
    createButton: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.4,
    },
    createButtonText: {
        fontSize: Typography.body,
        fontWeight: Weight.bold,
    },
});
