import { useMutation } from 'convex/react';
import { router, useGlobalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { KeyboardAwareScrollView, useKeyboardHandler } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const useKeyboardHeight = () => {
    const height = useSharedValue(0);

    useKeyboardHandler({
        onMove: (event) => {
            'worklet';
            height.value = Math.max(event.height, 0);
        },
        onEnd: (event) => {
            'worklet';
            height.value = Math.max(event.height, 0);
        },
    }, []);

    return { height };
};

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
    }, [squadId, title, tag, content, saving, createNote, isShared, canCreate]);

    const { height: keyboardHeight } = useKeyboardHeight();

    const spacerStyle = useAnimatedStyle(() => ({
        height: Math.abs(keyboardHeight.value),
    }));

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <KeyboardAwareScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                bottomOffset={80}
            >
                <View style={[styles.typeBadge, { backgroundColor: theme.accent, borderRadius: Radius.sm }]}>
                    <ThemedText type="smallBold" style={styles.typeBadgeText}>
                        {isShared ? "Shared" : "Personal"}
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
                    style={[styles.createButton, { backgroundColor: theme.accent, borderRadius: Radius.md }, !canCreate && styles.createButtonDisabled]}
                    disabled={!canCreate}
                >
                    <ThemedText style={styles.createButtonText}>
                        {saving ? "Creating..." : "Create"}
                    </ThemedText>
                </Pressable>
            </View>

            <Animated.View style={spacerStyle} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.three,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.two,
        paddingVertical: 2,
        marginBottom: Spacing.three,
    },
    typeBadgeText: {
        color: '#fff',
        fontSize: 11,
    },
    titleInput: {
        fontSize: 22,
        fontWeight: '600',
        paddingVertical: Spacing.one,
        marginBottom: Spacing.one,
    },
    tagInput: {
        fontSize: 14,
        paddingVertical: Spacing.one,
        marginBottom: Spacing.three,
        borderBottomWidth: 1,
    },
    contentInput: {
        minHeight: 200,
        fontSize: 16,
        lineHeight: 24,
        textAlignVertical: 'top',
    },
    buttonWrap: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.two,
        paddingBottom: Spacing.two,
        borderTopWidth: 1,
    },
    createButton: {
        paddingVertical: Spacing.three,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.3,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
