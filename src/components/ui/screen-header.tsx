/**
 * ScreenHeader — consistent header for all squad screens.
 *
 * Pattern from designs: ← Title 🎁  [icon button]
 *
 * Usage:
 *   <ScreenHeader title="Drops 🎁" onBack={handleBack} rightIcon={Plus} onRightPress={...} />
 *   <ScreenHeader title="🏠 The Cove" />   // no back or right button
 */
import { Image } from 'expo-image';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenHeaderProps {
  title: string;
  /** Optional avatar shown as a small circle to the left of the title */
  titleAvatarUri?: string | null;
  titleAvatarFallback?: string;
  onBack?: () => void;
  leftIcon?: LucideIcon;
  onLeftPress?: () => void;
  /** Show a notification dot on the left icon */
  leftBadge?: boolean;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  /** Show a notification dot on the right icon */
  rightBadge?: boolean;
  style?: ViewStyle;
  /** Optional subtitle shown below title (e.g. "● 5 online") */
  subtitle?: string;
}

export function ScreenHeader({
  title,
  titleAvatarUri,
  titleAvatarFallback,
  onBack,
  leftIcon: LeftIcon,
  onLeftPress,
  leftBadge,
  rightIcon: RightIcon,
  onRightPress,
  rightBadge,
  style,
  subtitle,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.outlineLight,
          paddingTop: insets.top + Spacing.sm,
        },
        style,
      ]}
    >
      {/* Left — back button, custom icon, or placeholder */}
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: theme.outline,
                backgroundColor: theme.surface,
              },
              pressed && styles.iconBtnPressed,
            ]}
          >
            <ChevronLeft size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>
        ) : LeftIcon && onLeftPress ? (
          <View>
            <Pressable
              onPress={onLeftPress}
              accessibilityRole="button"
              accessibilityLabel="Switch squad"
              hitSlop={8}
              style={styles.leftIconBtn}
            >
              <LeftIcon size={18} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
            {leftBadge ? <View style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.headerBackground }]} /> : null}
          </View>
        ) : null}
      </View>

      {/* Center — title */}
      <View style={styles.center}>
        <View style={styles.titleRow}>
          {titleAvatarUri ? (
            <Image source={{ uri: titleAvatarUri }} style={[styles.titleAvatar, { borderColor: 'rgba(61, 56, 51, 0.12)' }]} contentFit="cover" />
          ) : titleAvatarFallback ? (
            <View style={[styles.titleAvatar, styles.titleAvatarFallback, { backgroundColor: theme.accent, borderColor: 'rgba(61, 56, 51, 0.12)' }]}>
              <ThemedText style={styles.titleAvatarEmoji}>{titleAvatarFallback}</ThemedText>
            </View>
          ) : null}
          <ThemedText type="bodyBold" style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {/* Right — action button or placeholder */}
      <View style={styles.side}>
        {RightIcon && onRightPress ? (
          <View>
            <Pressable
              onPress={onRightPress}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: theme.outline,
                  backgroundColor: theme.surface,
                },
                pressed && styles.iconBtnPressed,
              ]}
            >
              <RightIcon size={18} color={theme.text} strokeWidth={2.5} />
            </Pressable>
            {rightBadge ? <View style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.headerBackground }]} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1.5,
  },
  side: {
    width: 44,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
  },
  titleAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleAvatarEmoji: {
    fontSize: 13,
  },
  title: {
    fontSize: Typography.body,
    fontWeight: Weight.bold,
  },
  subtitle: {
    marginTop: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  leftIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
