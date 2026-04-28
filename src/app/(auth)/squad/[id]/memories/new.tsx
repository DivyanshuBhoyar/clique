import { useMutation } from 'convex/react';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';

type MemoryType = 'wall' | 'event';

export default function NewMemoryScreen() {
    const router = useRouter();
    const { id, type } = useGlobalSearchParams<{ id: string; type?: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const theme = useTheme();

    const createMemory = useMutation(api.memories.createMemory);
    const { previewUri, uploading, pickAndUpload, reset } = useImageUpload();

    const initialType: MemoryType = type === 'event' ? 'event' : 'wall';
    const [memType, setMemType] = useState<MemoryType>(initialType);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [coverStorageId, setCoverStorageId] = useState<Id<"_storage"> | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const canSubmit = squadId !== undefined
        && !submitting
        && !uploading
        && (memType === 'wall' ? content.trim().length > 0 : title.trim().length > 0);

    const handlePickCover = async () => {
        const storageId = await pickAndUpload();
        if (storageId) {
            setCoverStorageId(storageId);
        }
    };

    const handleRemoveCover = () => {
        setCoverStorageId(null);
        reset();
    };

    const handleSubmit = async () => {
        if (!canSubmit || !squadId) return;
        setSubmitting(true);
        try {
            const memoryId = await createMemory({
                squadId,
                type: memType,
                title: memType === 'event' ? title.trim() : undefined,
                content: memType === 'wall' ? content.trim() : undefined,
                coverStorageId: memType === 'event' && coverStorageId ? coverStorageId : undefined,
            });
            router.replace(`/squad/${squadId}/memories/${memoryId}`);
        } catch {
            setSubmitting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                        <ThemedText style={styles.label}>Type</ThemedText>
                        <View style={styles.toggleRow}>
                            <Pressable
                                onPress={() => setMemType('wall')}
                                style={[
                                    styles.toggleBtn,
                                    { backgroundColor: theme.surface, borderColor: theme.outlineLight },
                                    memType === 'wall' && { backgroundColor: theme.accent, borderColor: theme.accent },
                                ]}
                            >
                                <ThemedText style={[styles.toggleText, memType === 'wall' && styles.toggleTextActive]}>
                                    Memory
                                </ThemedText>
                            </Pressable>
                            <Pressable
                                onPress={() => setMemType('event')}
                                style={[
                                    styles.toggleBtn,
                                    { backgroundColor: theme.surface, borderColor: theme.outlineLight },
                                    memType === 'event' && { backgroundColor: theme.accent, borderColor: theme.accent },
                                ]}
                            >
                                <ThemedText style={[styles.toggleText, memType === 'event' && styles.toggleTextActive]}>
                                    Event / Trip
                                </ThemedText>
                            </Pressable>
                        </View>

                        {memType === 'wall' ? (
                            <>
                                <ThemedText style={[styles.label, { marginTop: Spacing.three }]}>
                                    What do you want to remember?
                                </ThemedText>
                                <TextInput
                                    value={content}
                                    onChangeText={setContent}
                                    placeholder="rahul fell asleep before midnight on new year's eve..."
                                    placeholderTextColor={theme.textSecondary}
                                    style={[styles.textArea, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.surface }]}
                                    multiline
                                    autoFocus
                                    maxLength={500}
                                />
                            </>
                        ) : (
                            <>
                                <ThemedText style={[styles.label, { marginTop: Spacing.three }]}>Event title</ThemedText>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Trip to Goa, Game night..."
                                    placeholderTextColor={theme.textSecondary}
                                    style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.surface }]}
                                    maxLength={100}
                                    autoFocus
                                />

                                <ThemedText style={[styles.label, { marginTop: Spacing.three }]}>Cover photo</ThemedText>
                                {previewUri ? (
                                    <View style={styles.coverPreviewWrap}>
                                        <Image source={{ uri: previewUri }} style={styles.coverPreview} contentFit="cover" />
                                        <Pressable onPress={handleRemoveCover} style={styles.removeCoverBtn}>
                                            <ThemedText style={styles.removeCoverText}>Remove</ThemedText>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={handlePickCover}
                                        style={[styles.coverPickerBtn, { borderColor: theme.textSecondary, backgroundColor: theme.surface }]}
                                        disabled={uploading}
                                    >
                                        <ThemedText themeColor="textSecondary">
                                            {uploading ? 'Uploading...' : '+ Add cover photo'}
                                        </ThemedText>
                                    </Pressable>
                                )}
                            </>
                        )}

                        <View style={styles.submitRow}>
                            <Button
                                title={submitting ? 'Saving...' : 'Save'}
                                onPress={handleSubmit}
                                color={canSubmit ? theme.accent : theme.placeholder}
                                style={!canSubmit ? { opacity: 0.5 } : undefined}
                            />
                        </View>
                    </ScrollView>
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
    inner: {
        flex: 1,
    },
    scroll: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        paddingBottom: 40,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: Spacing.two,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 8,
    },
    toggleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#fff',
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 2,
        borderRadius: Radius.md,
    },
    textArea: {
        minHeight: 100,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        lineHeight: 24,
        borderWidth: 2,
        borderRadius: Radius.md,
        textAlignVertical: 'top',
    },
    submitRow: {
        marginTop: Spacing.three,
    },
    coverPickerBtn: {
        height: 120,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPreviewWrap: {
        borderRadius: Radius.md,
        overflow: 'hidden',
    },
    coverPreview: {
        height: 160,
        width: '100%',
        borderRadius: Radius.md,
    },
    removeCoverBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    removeCoverText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
