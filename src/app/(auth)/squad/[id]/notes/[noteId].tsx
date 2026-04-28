import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { formatRelativeTime } from '@/utils/time';

const AUTOSAVE_DELAY_MS = 500;

export default function NoteEditorScreen() {
    const theme = useTheme();
    const { noteId } = useLocalSearchParams<{ noteId: string }>();
    const typedNoteId = noteId as Id<"notes">;

    const note = useQuery(api.notes.getNote, { noteId: typedNoteId });
    const updateNote = useMutation(api.notes.updateNote);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [initialized, setInitialized] = useState(false);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleRef = useRef(title);
    const contentRef = useRef(content);

    titleRef.current = title;
    contentRef.current = content;

    useEffect(() => {
        if (note && !initialized) {
            setTitle(note.title);
            setContent(note.content);
            setInitialized(true);
        }
    }, [note, initialized]);

    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            if (typedNoteId) {
                updateNote({
                    noteId: typedNoteId,
                    title: titleRef.current,
                    content: contentRef.current,
                });
            }
        }, AUTOSAVE_DELAY_MS);
    }, [typedNoteId, updateNote]);

    const handleTitleChange = useCallback((text: string) => {
        setTitle(text);
        scheduleSave();
    }, [scheduleSave]);

    const handleContentChange = useCallback((text: string) => {
        setContent(text);
        scheduleSave();
    }, [scheduleSave]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    if (note === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    if (note === null) {
        return (
            <SafeAreaView style={styles.loading}>
                <ThemedText themeColor="textSecondary">Note not found</ThemedText>
            </SafeAreaView>
        );
    }

    const isShared = note.type === "shared";

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.flex}
                >
                    <View style={styles.editor}>
                        <TextInput
                            style={[styles.titleInput, { borderBottomColor: theme.outlineLight }]}
                            placeholder="Untitled"
                            placeholderTextColor={theme.placeholder}
                            value={title}
                            onChangeText={handleTitleChange}
                        />

                        {isShared && note.lastEditedByNickname && (
                            <ThemedText type="small" themeColor="textSecondary" style={styles.lastEdited}>
                                edited by {note.lastEditedByNickname} · {formatRelativeTime(note.updatedAt)}
                            </ThemedText>
                        )}

                        <TextInput
                            style={styles.contentInput}
                            placeholder="Start writing..."
                            placeholderTextColor={theme.placeholder}
                            value={content}
                            onChangeText={handleContentChange}
                            multiline
                            textAlignVertical="top"
                            autoFocus={initialized && !content}
                        />
                    </View>
                </KeyboardAvoidingView>
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
    },
    flex: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editor: {
        flex: 1,
        padding: Spacing.three,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '600',
        paddingVertical: Spacing.two,
        borderBottomWidth: 1,
        marginBottom: Spacing.two,
    },
    lastEdited: {
        marginBottom: Spacing.two,
        fontStyle: 'italic',
    },
    contentInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        textAlignVertical: 'top',
    },
});
