import { useRouter } from 'expo-router';
import { ChevronLeft, Settings } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backOrReplace } from '@/utils/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  channelName: string;
  channelEmoji?: string;
  onlineCount?: number;
  otherUnreadCount?: number;
  onTitlePress?: () => void;
  onSettingsPress?: () => void;
}

export function ChatHeader({ channelName, channelEmoji, onlineCount, otherUnreadCount = 0, onTitlePress, onSettingsPress }: ChatHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const previousUnreadCount = useRef(otherUnreadCount);
  const badgeScale = useSharedValue(1);
  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  useEffect(() => {
    if (otherUnreadCount > previousUnreadCount.current) {
      badgeScale.value = withSequence(
        withSpring(1.16, { damping: 8, stiffness: 280 }),
        withSpring(1, { damping: 10, stiffness: 260 })
      );
    }
    previousUnreadCount.current = otherUnreadCount;
  }, [badgeScale, otherUnreadCount]);

  const displayUnreadCount = otherUnreadCount > 99 ? '99+' : String(otherUnreadCount);

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
          onPress={() => backOrReplace(router, '..')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}
        >
          <ChevronLeft size={22} color={theme.text} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Pressable
        onPress={onTitlePress}
        accessibilityRole="button"
        accessibilityLabel="Switch channel"
        style={styles.titleButton}
      >
        <View style={styles.titleRow}>
          {channelEmoji ? (
            <ThemedText style={styles.channelEmoji}>{channelEmoji}</ThemedText>
          ) : null}
          <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {channelName} ▾
          </ThemedText>
          {otherUnreadCount > 0 ? (
            <Animated.View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: theme.surfaceAccent,
                  borderColor: theme.accentDark,
                  shadowColor: theme.shadow,
                },
                badgeAnimatedStyle,
              ]}
            >
              <ThemedText type="caption" style={[styles.unreadText, { color: theme.text }]}>
                {displayUnreadCount}
              </ThemedText>
            </Animated.View>
          ) : null}
        </View>
        {onlineCount != null && onlineCount > 0 ? (
          <ThemedText type="caption" style={[styles.subtitle, { color: theme.textTertiary }]}>
            {onlineCount} online
          </ThemedText>
        ) : null}
      </Pressable>

      <View style={styles.side}>
        {onSettingsPress && (
          <Pressable
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Channel settings"
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}
          >
            <Settings size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
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
  titleRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  title: {
    flexShrink: 1,
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    fontWeight: Weight.bold,
    textAlign: 'center',
  },
  channelEmoji: {
    fontSize: 18,
  },
  unreadBadge: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontWeight: Weight.black,
    lineHeight: 14,
  },
  subtitle: {
    marginTop: 1,
    textAlign: 'center',
  },
});
