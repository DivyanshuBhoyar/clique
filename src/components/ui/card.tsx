import { Pressable, View, type ViewStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { BorderWidth, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardVariant = 'default' | 'warm' | 'accent' | 'outline';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
  testID?: string;
}

const variantBgMap: Record<CardVariant, ThemeColor> = {
  default: 'surface',
  warm: 'surfaceWarm',
  accent: 'surfaceAccent',
  outline: 'background',
};

export function Card({
  children,
  onPress,
  variant = 'default',
  shadow = 'sm',
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: CardProps) {
  const theme = useTheme();
  const bg = theme[variantBgMap[variant]];
  const shadowDef = shadow !== 'none' ? Shadows[shadow] : null;

  const cardStyle: ViewStyle = {
    backgroundColor: bg,
    borderWidth: BorderWidth.thin,
    borderColor: theme.cardBorder,
    borderRadius: Radius.lg,
    ...contentStyle,
  };

  if (shadowDef) {
    cardStyle.shadowColor = theme.shadow;
    cardStyle.shadowOffset = shadowDef.offset;
    cardStyle.shadowOpacity = shadowDef.opacity;
    cardStyle.shadowRadius = shadowDef.radius;
    cardStyle.elevation = shadow === 'sm' ? 3 : shadow === 'md' ? 5 : 7;
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={({ pressed }) => [
          cardStyle,
          pressed && { backgroundColor: theme.backgroundSelected, transform: [{ scale: 0.97 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}
