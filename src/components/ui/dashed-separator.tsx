/**
 * DashedSeparator — horizontal dashed line used inside cards.
 *
 * Appears between card content and card footer (reactions, meta, etc.)
 * in all card types: DropCard, NoteCard, WallCard, etc.
 *
 * Usage:
 *   <DashedSeparator />
 *   <DashedSeparator marginVertical={Spacing.lg} />
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface DashedSeparatorProps {
  marginVertical?: number;
  color?: string;
  style?: ViewStyle;
}

export function DashedSeparator({ marginVertical = Spacing.md, color, style }: DashedSeparatorProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.line,
        {
          borderBottomColor: color ?? theme.dashedBorder,
          marginVertical,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    width: '100%',
    borderBottomWidth: 1.5,
    // React Native supports 'dashed' on iOS; on Android we use a dotted workaround
    borderStyle: 'dashed',
  },
});
