import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  channelName: string;
  onlineCount?: number;
  onTitlePress?: () => void;
}

export function ChatHeader({ channelName, onlineCount, onTitlePress }: ChatHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.sm,
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.outlineLight,
        },
      ]}
    >
      <View style={styles.side}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.iconButton}
        >
          <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Pressable
        onPress={onTitlePress}
        accessibilityRole="button"
        accessibilityLabel="Switch channel"
        style={styles.titleButton}
      >
        <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {channelName} ▾
        </ThemedText>
        {onlineCount != null && onlineCount > 0 ? (
          <ThemedText type="caption" style={[styles.subtitle, { color: theme.textTertiary }]}>
            {onlineCount} online
          </ThemedText>
        ) : null}
      </Pressable>

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1.5,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    fontWeight: Weight.bold,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 1,
    textAlign: 'center',
  },
});
