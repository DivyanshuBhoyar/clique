import { Search } from 'lucide-react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightAction?: React.ReactNode;
  variant?: 'default' | 'soft';
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  rightAction,
  variant = 'default',
}: SearchBarProps) {
  const theme = useTheme();
  const isSoft = variant === 'soft';

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.inputWrap,
          isSoft && styles.inputWrapSoft,
          { backgroundColor: theme.surface, borderColor: isSoft ? theme.outlineLight : theme.outline },
        ]}
      >
        <Search size={18} color={theme.placeholder} strokeWidth={isSoft ? 2 : 2.2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
        />
      </View>
      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
    minHeight: 52,
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrapSoft: {
    minHeight: 50,
    borderWidth: 1.25,
    borderRadius: Radius.full,
  },
  input: {
    flex: 1,
    fontSize: Typography.body,
    paddingVertical: Spacing.sm,
  },
});
