import { Search } from 'lucide-react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightAction?: React.ReactNode;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  rightAction,
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: theme.surface, borderColor: theme.outline },
        ]}
      >
        <Search size={18} color={theme.placeholder} strokeWidth={2.2} />
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
  input: {
    flex: 1,
    fontSize: Typography.body,
    paddingVertical: Spacing.sm,
  },
});
