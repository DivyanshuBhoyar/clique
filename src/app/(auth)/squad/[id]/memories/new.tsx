import { useMutation } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TypeToggle } from '@/components/ui/type-toggle';
import { LineHeight, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { getImageUploadPresetSummary } from '@/lib/image-upload';
import { backOrReplace } from '@/utils/navigation';

type MemoryType = 'wall' | 'event';

export default function NewMemoryScreen() {
    const router = useRouter();
    const { id, type } = useGlobalSearchParams<{ id: string; type?: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const theme = useTheme();

    const createMemory = useMutation(api.memories.createMemory);
    const { previewUri, uploading, pickAndUpload, reset } = useImageUpload({ target: 'memoryCover' });

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
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={memType === 'event' ? 'New Event 🎉' : 'New Memory 🧠'}
                    onBack={() => backOrReplace(router, `/squad/${squadId}/memories`)}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                        <ThemedText style={styles.label}>Type</ThemedText>
                        <TypeToggle
                            options={[
                              { label: '🧠 Memory', value: 'wall' },
                              { label: '🎉 Event / Trip', value: 'event' },
                            ]}
                            value={memType}
                            onChange={(v) => setMemType(v as MemoryType)}
                        />

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
                                <ImageUploadField
                                    previewUri={previewUri}
                                    uploading={uploading}
                                    onPick={handlePickCover}
                                    onRemove={handleRemoveCover}
                                    placeholder="+ Add wide cover photo"
                                    helperText={getImageUploadPresetSummary('memoryCover')}
                                    accessibilityLabel="Pick a wide memory cover photo"
                                />
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
    container: { flex: 1 },
    safeArea: { flex: 1 },
    inner: { flex: 1 },
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: 40,
    },
    label: {
        fontSize: Typography.small,
        fontWeight: Weight.bold,
        letterSpacing: 0.3,
        marginBottom: Spacing.sm,
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: Typography.body,
        borderWidth: 2,
        borderRadius: 12,
    },
    textArea: {
        minHeight: 100,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: Typography.body,
        lineHeight: LineHeight.body,
        borderWidth: 2,
        borderRadius: 12,
        textAlignVertical: 'top',
    },
    submitRow: {
        marginTop: Spacing.three,
    },
});
