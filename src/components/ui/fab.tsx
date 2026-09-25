import { Pressable, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, BottomTabInset, LineHeight, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FabProps {
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Fab({ onPress, icon = '+', style, accessibilityLabel }: FabProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Create new'}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: Spacing.xxl,
          bottom: BottomTabInset + Spacing.lg,
          width: 56,
          height: 56,
          borderRadius: Radius.full,
          backgroundColor: theme.fabBackground,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: BorderWidth.medium,
          borderColor: theme.outline,
          shadowColor: theme.shadow,
          shadowOffset: Shadows.md.shadowOffset,
          shadowOpacity: Shadows.md.shadowOpacity,
          shadowRadius: Shadows.md.shadowRadius,
          elevation: 5,
        },
        pressed && { transform: [{ scale: 0.93 }] },
        style,
      ]}
    >
      <ThemedText style={{ fontSize: Typography.heading, fontWeight: Weight.semibold, color: theme.fabText, lineHeight: LineHeight.heading }}>
        {icon}
      </ThemedText>
    </Pressable>
  );
}
