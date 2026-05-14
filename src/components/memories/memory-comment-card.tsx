import { Heart } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LinkPreviewCard } from '@/components/ui/link-preview-card';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractUrls } from '@/utils/links';
import { formatRelativeTime } from '@/utils/time';

interface MemoryCommentCardProps {
    avatarUrl?: string | null;
    nickname: string;
    content: string;
    createdAt: number;
}

export function MemoryCommentCard({ avatarUrl, nickname, content, createdAt }: MemoryCommentCardProps) {
    const theme = useTheme();
    const firstUrl = extractUrls(content)[0]?.url;

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.header}>
                <UserAvatar uri={avatarUrl} size={24} fallbackText={nickname} />
                <ThemedText type="smallBold">@{nickname}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.time}>
                    {formatRelativeTime(createdAt)}
                </ThemedText>
            </View>
            <LinkifiedText style={styles.content}>{content}</LinkifiedText>
            {firstUrl ? <LinkPreviewCard url={firstUrl} compact /> : null}
            <View style={styles.footer}>
                <View style={styles.heartRow}>
                    <Heart size={13} color={theme.accent} strokeWidth={2} />
                    <ThemedText type="caption" style={{ color: theme.accent, fontWeight: Weight.semibold }}>0</ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        padding: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Radius.md,
        gap: Spacing.xs,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    time: {
        marginLeft: 'auto',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    heartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    content: {
        fontSize: Typography.body,
        lineHeight: LineHeight.subtitle,
    },
});
