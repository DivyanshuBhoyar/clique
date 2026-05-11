import { Bold, CheckSquare, Heading1, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TOOLBAR_ITEMS = [
  { key: 'bold', icon: Bold, prefix: '**', suffix: '**' },
  { key: 'italic', icon: Italic, prefix: '*', suffix: '*' },
  { key: 'h1', icon: Heading1, prefix: '# ', suffix: '' },
  { key: 'bullet', icon: List, prefix: '- ', suffix: '' },
  { key: 'number', icon: ListOrdered, prefix: '1. ', suffix: '' },
  { key: 'check', icon: CheckSquare, prefix: '- [ ] ', suffix: '' },
  { key: 'link', icon: LinkIcon, prefix: '[', suffix: '](url)' },
] as const;

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix: string) => void;
}

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolbar}
      style={[styles.wrap, { borderBottomColor: theme.outlineLight }]}
    >
      {TOOLBAR_ITEMS.map(({ key, icon: Icon, prefix, suffix }) => (
        <Pressable
          key={key}
          onPress={() => onInsert(prefix, suffix)}
          style={({ pressed }) => [
            styles.btn,
            { borderColor: theme.outline, backgroundColor: theme.surface },
            pressed && styles.btnPressed,
          ]}
          accessibilityLabel={key}
        >
          <Icon size={16} color={theme.text} strokeWidth={2.5} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    maxHeight: 52,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
