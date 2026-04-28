import { useMutation } from 'convex/react';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DROP_CATEGORIES, type DropCategoryKey } from '@/constants/drops';
import { Spacing, Radius } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

export default function NewDropScreen() {
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const theme = useTheme();

    const createDrop = useMutation(api.drops.createDrop);

    const [selectedCategory, setSelectedCategory] = useState<DropCategoryKey | 'other' | null>(null);
    const [customCategory, setCustomCategory] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const category = selectedCategory === 'other'
        ? customCategory.trim()
        : (selectedCategory ?? '');

    const canSubmit = squadId !== undefined && category.length > 0 && content.trim().length > 0 && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit || !squadId) return;
        setSubmitting(true);
        try {
            await createDrop({ squadId, category, content: content.trim() });
            router.back();
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
                        <ThemedText style={styles.label}>Category</ThemedText>

                        <View style={styles.chipsRow}>
                            {DROP_CATEGORIES.map((cat) => (
                                <Pressable
                                    key={cat.key}
                                    onPress={() => setSelectedCategory(cat.key)}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: theme.surface, borderColor: theme.outlineLight },
                                        selectedCategory === cat.key && { backgroundColor: theme.accent, borderColor: theme.accent },
                                    ]}
                                >
                                    <ThemedText
                                        style={[
                                            styles.chipText,
                                            selectedCategory === cat.key && { color: '#fff' },
                                        ]}
                                    >
                                        {cat.label}
                                    </ThemedText>
                                </Pressable>
                            ))}

                            <Pressable
                                onPress={() => setSelectedCategory('other')}
                                style={[
                                    styles.chip,
                                    { backgroundColor: theme.surface, borderColor: theme.outlineLight },
                                    selectedCategory === 'other' && { backgroundColor: theme.accent, borderColor: theme.accent },
                                ]}
                            >
                                <ThemedText
                                    style={[
                                        styles.chipText,
                                        selectedCategory === 'other' && { color: '#fff' },
                                    ]}
                                >
                                    ✏️ Other
                                </ThemedText>
                            </Pressable>
                        </View>

                        {selectedCategory === 'other' && (
                            <TextInput
                                value={customCategory}
                                onChangeText={setCustomCategory}
                                placeholder="e.g. 🎮 Game, 🍕 Food..."
                                placeholderTextColor={theme.placeholder}
                                style={[styles.customInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface }]}
                                maxLength={30}
                            />
                        )}

                        <ThemedText style={[styles.label, { marginTop: Spacing.three }]}>
                            What are you dropping?
                        </ThemedText>

                        <TextInput
                            value={content}
                            onChangeText={setContent}
                            placeholder="Share something cool..."
                            placeholderTextColor={theme.textSecondary}
                            style={[styles.contentInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface }]}
                            multiline
                            maxLength={2000}
                        />

                        <View style={styles.submitRow}>
                            <Button
                                title={submitting ? 'Dropping...' : 'Drop it'}
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
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radius.lg,
        borderWidth: 2,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    customInput: {
        marginTop: Spacing.two,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        borderWidth: 2,
        borderRadius: Radius.md,
    },
    contentInput: {
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
});
