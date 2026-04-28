import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';

interface NoteCardProps {
    title: string;
    content: string;
    updatedAt: number;
    tag?: string;
    type: "personal" | "journal";
    pinned?: boolean;
}

export function NoteCard({ title, content, updatedAt, tag, type, pinned }: NoteCardProps) {
    const theme = useTheme();
    const time = formatRelativeTime(updatedAt);

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.header}>
                <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
                    <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '600' }}>
                        {tag ?? (type === "journal" ? "Journal" : "Note")}
                    </ThemedText>
                </View>
                {pinned && (
                    <ThemedText type="caption" themeColor="textTertiary">pinned</ThemedText>
                )}
                <ThemedText type="caption" themeColor="textSecondary">{time}</ThemedText>
            </View>
            <ThemedText numberOfLines={1} style={styles.title}>{title || "Untitled"}</ThemedText>
            {content ? (
                <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
                    {content}
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
        alignItems: 'center',
        gap: Spacing.sm,
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
});
