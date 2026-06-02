import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal, Pin } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownPreview } from '@/components/notes/markdown-preview';
import { MarkdownToolbar } from '@/components/notes/markdown-toolbar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { ScreenHeader } from '@/components/ui/screen-header';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useJournalKey } from '@/hooks/use-journal-key';
import { useMarkdownInsert } from '@/hooks/use-markdown-insert';
import { useTheme } from '@/hooks/use-theme';
import { decryptContent, encryptContent } from '@/lib/journalCrypto';
import { backOrReplace } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/time';

export default function NoteEditorScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id, noteId } = useLocalSearchParams<{ id: string; noteId: string }>();
    const squadId = id as Id<'squads'>;
    const typedNoteId = noteId as Id<'notes'>;
    const { key: journalKey } = useJournalKey();

    const note = useQuery(api.notes.getNote, { noteId: typedNoteId });
    const updateNote = useMutation(api.notes.updateNote);
    const togglePin = useMutation(api.notes.toggleNotePin);
    const deleteNote = useMutation(api.notes.deleteNote);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [initialized, setInitialized] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleRef = useRef(title);
    const contentRef = useRef(content);

    titleRef.current = title;
    contentRef.current = content;

    useEffect(() => {
        if (!note || initialized) return;

        let displayContent = note.content;

        // Decrypt journal content if it was encrypted — wait for key to be ready
        if (note.type === 'journal' && note.encrypted && note.nonce) {
            if (!journalKey) return; // key not yet loaded from SecureStore; wait
            const decrypted = decryptContent(note.content, note.nonce, journalKey);
            displayContent = decrypted ?? ''; // null means corrupted/wrong key; show blank
        }

        setTitle(note.title);
        setContent(displayContent);
        setInitialized(true);
    }, [note, initialized, journalKey]);

    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus('saving');
        saveTimerRef.current = setTimeout(async () => {
            if (!typedNoteId || !note) return;

            if (note.type === 'journal' && journalKey) {
                // Encrypt content before persisting — title stays plaintext
                const { ct, nonce } = encryptContent(contentRef.current, journalKey);
                await updateNote({
                    noteId: typedNoteId,
                    title: titleRef.current,
                    content: ct,
                    nonce,
                    encrypted: true,
                });
            } else {
                await updateNote({
                    noteId: typedNoteId,
                    title: titleRef.current,
                    content: contentRef.current,
                });
            }
            setSaveStatus('saved');
        }, 500);
    }, [typedNoteId, note, journalKey, updateNote]);

    useEffect(() => {
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, []);

    const handleTitleChange = useCallback((text: string) => {
        setTitle(text);
        scheduleSave();
    }, [scheduleSave]);

    const handleContentChange = useCallback((text: string) => {
        setContent(text);
        scheduleSave();
    }, [scheduleSave]);

    const { handleSelectionChange, insertMarkdown } = useMarkdownInsert(content, setContent, scheduleSave);

    const handleMorePress = useCallback(() => {
        if (!note) return;
        const isPersonal = note.type === 'personal' || note.type === 'journal';
        const isPinned = note.pinned;

        const options = [
            ...(isPersonal ? [isPinned ? '📌 Unpin' : '📌 Pin note'] : []),
            '🗑 Delete note',
            'Cancel',
        ];
        const destructiveIdx = options.indexOf('🗑 Delete note');
        const cancelIdx = options.indexOf('Cancel');

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx },
                async (buttonIdx) => {
                    if (buttonIdx === cancelIdx) return;
                    if (options[buttonIdx]?.startsWith('📌')) {
                        await togglePin({ noteId: typedNoteId });
                    } else if (options[buttonIdx]?.startsWith('🗑')) {
                        await deleteNote({ noteId: typedNoteId });
                        backOrReplace(router, `/squad/${squadId}/notes`);
                    }
                },
            );
        } else {
            Alert.alert(
                'Note actions',
                undefined,
                [
                    ...(isPersonal ? [{
                        text: isPinned ? '📌 Unpin' : '📌 Pin note',
                        onPress: () => togglePin({ noteId: typedNoteId }),
                    }] : []),
                    {
                        text: '🗑 Delete note',
                        style: 'destructive' as const,
                        onPress: async () => {
                            await deleteNote({ noteId: typedNoteId });
                            backOrReplace(router, `/squad/${squadId}/notes`);
                        },
                    },
                    { text: 'Cancel', style: 'cancel' as const },
                ],
            );
        }
    }, [note, typedNoteId, togglePin, deleteNote, router]);

    if (note === undefined) {
        return <LoadingState />;
    }

    if (note === null) {
        return <NotFoundState message="Note not found" />;
    }

    const isShared = note.type === 'shared';
    const isPersonal = note.type === 'personal' || note.type === 'journal';

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={'Note 📝'}
                    onBack={() => backOrReplace(router, `/squad/${squadId}/notes`)}
                    rightIcon={MoreHorizontal}
                    onRightPress={handleMorePress}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.flex}
                >
                    <ScrollView
                        style={styles.editorScroll}
                        contentContainerStyle={styles.editorContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {note.pinned && isPersonal && (
                            <View style={[styles.pinnedBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                                <Pin size={11} color={theme.accent} strokeWidth={2.5} fill={theme.accent} />
                                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: Weight.bold }}>
                                    Pinned
                                </ThemedText>
                            </View>
                        )}

                        {isShared && (
                            <View
                                style={[
                                    styles.sharedBadge,
                                    { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                                ]}
                            >
                                <ThemedText
                                    type="caption"
                                    style={{ color: theme.accent, fontWeight: Weight.bold }}
                                >
                                    🤝 Shared Note
                                </ThemedText>
                                {note.lastEditedByNickname && (
                                    <ThemedText type="caption" themeColor="textSecondary">
                                        · edited by @{note.lastEditedByNickname} · {formatRelativeTime(note.updatedAt)}
                                    </ThemedText>
                                )}
                            </View>
                        )}

                        <DashedSeparator marginVertical={Spacing.sm} />

                        <View style={[styles.titleCard, { borderColor: theme.outlineLight }]}>
                            <TextInput
                                style={[styles.titleInput, { color: theme.text }]}
                                placeholder="Untitled"
                                placeholderTextColor={theme.placeholder}
                                value={title}
                                onChangeText={handleTitleChange}
                                returnKeyType="next"
                            />
                        </View>

                        <View style={[styles.modeToggle, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            {(['write', 'preview'] as const).map((mode) => {
                                const isActive = editorMode === mode;
                                return (
                                    <Pressable
                                        key={mode}
                                        onPress={() => setEditorMode(mode)}
                                        style={[
                                            styles.modeButton,
                                            {
                                                backgroundColor: isActive ? theme.accent : 'transparent',
                                                borderRightColor: theme.outline,
                                            },
                                            mode === 'write' && styles.modeButtonDivider,
                                        ]}
                                        accessibilityRole="tab"
                                        accessibilityState={{ selected: isActive }}
                                        accessibilityLabel={mode === 'write' ? 'Write markdown' : 'Preview markdown'}
                                    >
                                        <ThemedText
                                            type="smallBold"
                                            style={{ color: isActive ? theme.text : theme.textSecondary }}
                                        >
                                            {mode === 'write' ? 'Write' : 'Preview'}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {editorMode === 'write' && <MarkdownToolbar onInsert={insertMarkdown} />}

                        {editorMode === 'write' ? (
                            <TextInput
                                style={[styles.contentInput, { color: theme.text }]}
                                placeholder="Start writing… ✍️"
                                placeholderTextColor={theme.placeholder}
                                value={content}
                                onChangeText={handleContentChange}
                                onSelectionChange={handleSelectionChange}
                                multiline
                                textAlignVertical="top"
                                autoFocus={initialized && !content}
                            />
                        ) : (
                            <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                                {content.trim().length > 0 ? (
                                    <MarkdownPreview content={content} />
                                ) : (
                                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyPreviewText}>
                                        Nothing to preview yet. Switch back to Write and start typing.
                                    </ThemedText>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <SaveIndicator status={saveStatus} />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    editorScroll: { flex: 1 },
    editorContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        marginBottom: Spacing.sm,
    },
    sharedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
        flexWrap: 'wrap',
    },
    titleCard: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    titleInput: {
        fontSize: Typography.heading,
        fontWeight: Weight.bold,
    },
    contentInput: {
        fontSize: Typography.body,
        lineHeight: LineHeight.subtitle,
        textAlignVertical: 'top',
        minHeight: 200,
    },
    modeToggle: {
        flexDirection: 'row',
        borderWidth: 2,
        borderRadius: Radius.md,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    modeButton: {
        flex: 1,
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeButtonDivider: {
        borderRightWidth: 2,
    },
    previewCard: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        minHeight: 220,
    },
    emptyPreviewText: {
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});
