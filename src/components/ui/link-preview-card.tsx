import { Link2 } from 'lucide-react-native';
import { GestureResponderEvent, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDomain, getUrlLabel, normalizeUrl } from '@/utils/links';

interface LinkPreviewCardProps {
  url: string;
  compact?: boolean;
  /** Rendered inside a chat bubble — uses quote-block styling. */
  embedded?: boolean;
  /** Bubble tone for embedded cards: 'out' (own) or 'in' (incoming). */
  tone?: 'out' | 'in';
  soft?: boolean;
}

export function LinkPreviewCard({ url, compact = false, embedded = false, tone = 'in', soft = false }: LinkPreviewCardProps) {
  const theme = useTheme();
  const normalizedUrl = normalizeUrl(url);
  const domain = getDomain(normalizedUrl);
  const label = getUrlLabel(normalizedUrl);

  // Embedded cards follow the quote-block treatment: flat fill, 3px left bar, no rounding.
  const quoteBg = tone === 'out' ? theme.chatQuoteOutBg : theme.chatQuoteInBg;
  const quoteBar = tone === 'out' ? theme.chatQuoteOutBar : theme.chatQuoteInBar;
  const quoteText = tone === 'out' ? theme.chatQuoteOutText : theme.chatQuoteInText;

  return (
    <Pressable
      onPress={(event) => openExternalUrl(normalizedUrl, event)}
      onStartShouldSetResponder={() => true}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        soft && styles.softCard,
        {
          backgroundColor: embedded ? quoteBg : soft ? theme.surfaceAccent : theme.backgroundElement,
          borderColor: embedded ? quoteBar : soft ? theme.tabBarBorder : theme.outlineLight,
        },
        embedded && styles.embeddedCard,
        pressed && styles.pressed,
      ]}
      accessibilityRole="link"
      accessibilityLabel={`Open link to ${domain}`}
    >
      <View style={[styles.iconBox, { backgroundColor: embedded ? quoteBg : theme.surface, borderColor: embedded ? quoteBar : theme.outlineLight }]}>
        <Link2 size={compact ? 13 : 15} color={embedded ? quoteText : theme.text} strokeWidth={2.5} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.domain, embedded && { color: quoteText }]} numberOfLines={1}>
          {domain}
        </ThemedText>
        <ThemedText type={compact ? 'caption' : 'small'} style={[styles.label, embedded && { color: quoteText }]} numberOfLines={compact ? 1 : 2}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function openExternalUrl(url: string, event?: GestureResponderEvent) {
  event?.stopPropagation();
  Linking.openURL(normalizeUrl(url)).catch(() => {
    // Keep the surrounding card interaction intact if the OS cannot open the URL.
  });
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
  embeddedCard: {
    // Quote blocks: no rounding, single 3px left bar
    borderWidth: 0,
    borderLeftWidth: 3,
    borderRadius: 0,
  },
  softCard: {
    borderWidth: 1,
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
