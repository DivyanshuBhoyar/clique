import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';

interface SharedNoteCardProps {
    title: string;
    content: string;
    updatedAt: number;
    tag?: string;
    lastEditedByNickname?: string | null;
}

export function SharedNoteCard({ title, content, updatedAt, tag, lastEditedByNickname }: SharedNoteCardProps) {
    const theme = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.header}>
                <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
                    <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '600' }}>
                        {tag ?? "Shared"}
                    </ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                    {formatRelativeTime(updatedAt)}
                </ThemedText>
            </View>
            <ThemedText numberOfLines={1} style={styles.title}>
                {title || "Untitled"}
            </ThemedText>
            {content ? (
                <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
                    {content}
                </ThemedText>
            ) : null}
            {lastEditedByNickname ? (
                <ThemedText type="caption" themeColor="textTertiary" style={styles.editor}>
                    edited by {lastEditedByNickname}
                </ThemedText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    chip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        overflow: 'hidden',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    editor: {
        marginTop: Spacing.xs,
        fontStyle: 'italic',
    },
});
