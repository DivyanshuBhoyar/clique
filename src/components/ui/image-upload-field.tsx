import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ImageUploadFieldProps {
  previewUri: string | null;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  placeholder?: string;
  helperText?: string;
  accessibilityLabel?: string;
}

export function ImageUploadField({
  previewUri,
  uploading,
  onPick,
  onRemove,
  placeholder = '+ Add photo',
  helperText,
  accessibilityLabel,
}: ImageUploadFieldProps) {
  const theme = useTheme();

  if (previewUri) {
    return (
      <View style={styles.fieldWrap}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={onRemove}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel="Remove selected image"
          >
            <ThemedText style={styles.removeText}>Remove</ThemedText>
          </Pressable>
        </View>
        {helperText ? <ThemedText type="caption" themeColor="textSecondary">{helperText}</ThemedText> : null}
      </View>
    );
  }

  return (
    <View style={styles.fieldWrap}>
      <Pressable
        onPress={onPick}
        style={[styles.pickerBtn, { borderColor: theme.textSecondary, backgroundColor: theme.surface }]}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? placeholder}
      >
        <ThemedText themeColor="textSecondary">
          {uploading ? 'Uploading...' : placeholder}
        </ThemedText>
      </Pressable>
      {helperText ? <ThemedText type="caption" themeColor="textSecondary">{helperText}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: Spacing.xs,
  },
  pickerBtn: {
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  preview: {
    height: 160,
    width: '100%',
    borderRadius: Radius.md,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  removeText: {
    color: '#fff',
    fontSize: Typography.caption,
    fontWeight: Weight.semibold,
  },
});
