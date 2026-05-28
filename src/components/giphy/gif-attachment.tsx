/**
 * GifAttachment — renders an animated GIF inside a chat bubble or comment card.
 * Uses expo-image for hardware-accelerated GIF playback.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GifAttachmentProps {
  gifUrl: string;
  gifTitle?: string | null;
  /** Max display width — defaults to 240 (fits inside a chat bubble on all phones) */
  maxWidth?: number;
  onPress?: () => void;
}

export function GifAttachment({ gifUrl, gifTitle, maxWidth = 240, onPress }: GifAttachmentProps) {
  const theme = useTheme();

  const inner = (
    <View style={[styles.wrap, { width: maxWidth, borderColor: theme.outlineLight }]}>
      <Image
        source={{ uri: gifUrl }}
        style={styles.image}
        contentFit="cover"
        autoplay
        accessibilityLabel={gifTitle ?? 'GIF'}
        recyclingKey={gifUrl}
      />
      {/* GIPHY "GIF" badge — top-right corner */}
      <View style={[styles.badge, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
        <ThemedText style={styles.badgeText}>GIF</ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={gifTitle ?? 'GIF'}>
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  badge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: Weight.bold,
    color: '#2D2D2D',
  },
});
