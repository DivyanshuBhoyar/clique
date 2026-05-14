import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScrapbookSection } from '@/components/memories/scrapbook-section';
import { WallQuoteCard } from '@/components/memories/wall-quote-card';
import { ThemedText } from '@/components/themed-text';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface MemoryDetailHeaderProps {
    memory: {
        _id: Id<'memories'>;
        type: 'wall' | 'event';
        title?: string;
        content?: string;
        createdAt: number;
    };
    nickname: string;
    reactions: { emoji: string; count: number; reacted: boolean }[];
    items: any[];
    coverUrl?: string | null;
    currentUserId?: string;
    commentCount: number;
    onOpenCover: () => void;
    onToggleReaction: (emoji: string) => void;
    onAddMemoryReaction: () => void;
    onToggleItemReaction: (itemId: string, emoji: string) => void;
    onAddItemReaction: (itemId: string) => void;
    onAddItem: () => void;
    onViewPhotos?: () => void;
    onViewItemComments: (itemId: string) => void;
}

export function MemoryDetailHeader({
    memory,
    nickname,
    reactions,
    items,
    coverUrl,
    currentUserId,
    commentCount,
    onOpenCover,
    onToggleReaction,
    onAddMemoryReaction,
    onToggleItemReaction,
    onAddItemReaction,
    onAddItem,
    onViewPhotos,
    onViewItemComments,
}: MemoryDetailHeaderProps) {
    const theme = useTheme();
    const isWall = memory.type === 'wall';
    const isEvent = memory.type === 'event';

    return (
        <>
            {isWall && (
                <WallQuoteCard content={memory.content ?? ''} title={memory.title} />
            )}

            {isEvent && coverUrl && (
                <Pressable onPress={onOpenCover} accessibilityRole="button" accessibilityLabel="Open memory cover image">
                    <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
                </Pressable>
            )}
            {isEvent && memory.title && (
                <ThemedText style={styles.eventTitle}>{memory.title}</ThemedText>
            )}

            <View style={styles.authorRow}>
                <UserAvatar uri={null} size={28} fallbackText={nickname} />
                <ThemedText type="small" style={{ fontWeight: Weight.semibold }}>@{nickname}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                    {'·'} {formatRelativeTime(memory.createdAt)}
                </ThemedText>
            </View>

            <DashedSeparator marginVertical={Spacing.sm} />

            <EmojiReactionStrip
                reactions={reactions}
                onToggle={onToggleReaction}
                onAdd={onAddMemoryReaction}
                wrap
            />

            {commentCount > 0 && (
                <ThemedText type="small" style={[styles.commentCountLink, { color: theme.accent }]}>
                    {commentCount} comment{commentCount !== 1 ? 's' : ''} 💬
                </ThemedText>
            )}

            {isEvent && (
                <ScrapbookSection
                    items={items.map((item: any) => ({
                        _id: item._id,
                        type: item.type,
                        content: item.content,
                        caption: item.caption ?? undefined,
                        photoUrl: item.photoUrl,
                        avatarUrl: item.avatarUrl,
                        nickname: item.nickname,
                        createdAt: item.createdAt,
                        reactions: item.reactions,
                        commentCount: item.commentCount,
                    }))}
                    currentUserId={currentUserId}
                    onToggleItemReaction={onToggleItemReaction}
                    onAddItemReaction={onAddItemReaction}
                    onAddItem={onAddItem}
                    onViewPhotos={onViewPhotos}
                    onViewItemComments={onViewItemComments}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    commentCountLink: {
        fontWeight: Weight.semibold,
        marginTop: Spacing.xs,
    },
    eventTitle: {
        fontSize: Typography.subtitle,
        fontWeight: Weight.extrabold,
    },
    coverImage: {
        height: 220,
        borderRadius: 16,
        width: '100%',
    },
});
