/**
 * ScreenHeader — consistent header for all squad screens.
 *
 * Pattern from designs: ← Title 🎁  [icon button]
 *
 * Usage:
 *   <ScreenHeader title="Drops 🎁" onBack={() => router.back()} rightIcon={Plus} onRightPress={...} />
 *   <ScreenHeader title="🏠 The Cove" />   // no back or right button
 */
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Weight, Typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  style?: ViewStyle;
  /** Optional subtitle shown below title (e.g. "● 5 online") */
  subtitle?: string;
}

export function ScreenHeader({
  title,
  onBack,
  rightIcon: RightIcon,
  onRightPress,
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
      {/* Left — back button or placeholder */}
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
        ) : null}
      </View>

      {/* Center — title */}
      <View style={styles.center}>
        <ThemedText type="bodyBold" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {/* Right — action button or placeholder */}
      <View style={styles.side}>
        {RightIcon && onRightPress ? (
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
});
