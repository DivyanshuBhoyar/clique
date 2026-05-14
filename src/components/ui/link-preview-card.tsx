import { Link2 } from 'lucide-react-native';
import { GestureResponderEvent, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDomain, getUrlLabel, normalizeUrl } from '@/utils/links';

interface LinkPreviewCardProps {
  url: string;
  compact?: boolean;
  embedded?: boolean;
}

export function openExternalUrl(url: string, event?: GestureResponderEvent) {
  event?.stopPropagation();
  Linking.openURL(normalizeUrl(url)).catch(() => {
    // Keep the surrounding card interaction intact if the OS cannot open the URL.
  });
}

export function LinkPreviewCard({ url, compact = false, embedded = false }: LinkPreviewCardProps) {
  const theme = useTheme();
  const normalizedUrl = normalizeUrl(url);
  const domain = getDomain(normalizedUrl);
  const label = getUrlLabel(normalizedUrl);

  return (
    <Pressable
      onPress={(event) => openExternalUrl(normalizedUrl, event)}
      onStartShouldSetResponder={() => true}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        {
          backgroundColor: embedded ? 'rgba(255,255,255,0.25)' : theme.backgroundElement,
          borderColor: embedded ? 'rgba(45,45,45,0.35)' : theme.outlineLight,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="link"
      accessibilityLabel={`Open link to ${domain}`}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}> 
        <Link2 size={compact ? 13 : 15} color={theme.text} strokeWidth={2.5} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.domain} numberOfLines={1}>
          {domain}
        </ThemedText>
        <ThemedText type={compact ? 'caption' : 'small'} style={styles.label} numberOfLines={compact ? 1 : 2}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  compactCard: {
    minHeight: 46,
    paddingVertical: Spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  domain: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: Weight.bold,
  },
  label: {
    fontWeight: Weight.medium,
  },
});
