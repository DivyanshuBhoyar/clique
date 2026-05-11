import { useMutation } from 'convex/react';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CategorySelector } from '@/components/drops/category-selector';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type DropCategoryKey } from '@/constants/drops';
import { LineHeight, Spacing, Typography, Weight } from '@/constants/theme';
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
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ScreenHeader
          title="New Drop 🎁"
          onBack={() => router.back()}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ThemedText style={styles.label}>Category</ThemedText>

            <CategorySelector
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              customValue={customCategory}
              onCustomChange={setCustomCategory}
            />

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
  contentInput: {
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
