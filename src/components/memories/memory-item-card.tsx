/**
 * MemoryItemCard — a single scrapbook item within an event memory.
 * Supports three types: reflection (text), photo (image + caption), link (URL preview).
 *
 * Design: white card, 2px border, Radius.md, EmojiReactionStrip at bottom.
 * Photo items show full-width image with tappable full-screen viewer.
 * Link items show a shared preview card with domain/URL context.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ImageViewer } from '@/components/image-viewer';
import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { LinkPreviewCard } from '@/components/ui/link-preview-card';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractUrls } from '@/utils/links';
import { formatRelativeTime } from '@/utils/time';

interface Reaction {
    emoji: string;
    userId: string;
}

interface MemoryItemCardProps {
    type: 'reflection' | 'photo' | 'link';
    content: string;
    caption?: string;
    photoUrl?: string | null;
    avatarUrl?: string | null;
    nickname: string;
    createdAt: number;
    reactions: Reaction[];
    commentCount: number;
    currentUserId?: string;
    onToggleReaction: (emoji: string) => void;
    onAddReaction?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
    reflection: '💭 Reflection',
    photo: '📸 Photo',
    link: '🔗 Link',
};

export function MemoryItemCard({
    type,
    content,
    caption,
    photoUrl,
    avatarUrl,
    nickname,
    createdAt,
    reactions,
    commentCount,
    currentUserId,
    onToggleReaction,
    onAddReaction,
}: MemoryItemCardProps) {
    const theme = useTheme();
    const [viewerVisible, setViewerVisible] = useState(false);
    const firstContentUrl = extractUrls(content)[0]?.url;
    const firstCaptionUrl = caption ? extractUrls(caption)[0]?.url : undefined;

    const groupedReactions = (() => {
        const map = new Map<string, { count: number; reacted: boolean }>();
        for (const r of reactions) {
            const ex = map.get(r.emoji) ?? { count: 0, reacted: false };
            ex.count++;
            if (r.userId === currentUserId) ex.reacted = true;
            map.set(r.emoji, ex);
        }
        return [...map.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }));
    })();

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            {/* Header: type chip + author */}
            <View style={styles.header}>
                <View style={[styles.typeChip, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>
                    <ThemedText type="caption" style={{ color: theme.accent, fontWeight: Weight.bold }}>
                        {TYPE_LABEL[type] ?? type}
                    </ThemedText>
                </View>
                <View style={styles.authorRow}>
                    <UserAvatar uri={avatarUrl} size={16} fallbackText={nickname} />
                    <ThemedText type="caption" themeColor="textSecondary">
                        @{nickname} · {formatRelativeTime(createdAt)}
                    </ThemedText>
                </View>
            </View>

            {/* Photo */}
            {type === 'photo' && (
                photoUrl ? (
                    <Pressable onPress={() => setViewerVisible(true)}>
                        <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
                    </Pressable>
                ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="small" themeColor="textSecondary">No photo yet</ThemedText>
                    </View>
                )
            )}

            {/* Link preview */}
            {type === 'link' ? (
                <LinkPreviewCard url={content} />
            ) : (
                <>
                    <LinkifiedText style={styles.content}>{content}</LinkifiedText>
                    {firstContentUrl ? <LinkPreviewCard url={firstContentUrl} compact /> : null}
                </>
            )}

            {/* Photo caption */}
            {type === 'photo' && caption ? (
                <>
                    <LinkifiedText type="caption" themeColor="textTertiary" style={styles.caption}>{caption}</LinkifiedText>
                    {firstCaptionUrl ? <LinkPreviewCard url={firstCaptionUrl} compact /> : null}
                </>
            ) : null}

            {/* Footer: reactions + comment count */}
            {(groupedReactions.length > 0 || commentCount > 0 || onAddReaction) && (
                <View style={styles.footer}>
                    {(groupedReactions.length > 0 || onAddReaction) && (
                        <EmojiReactionStrip
                            reactions={groupedReactions}
                            onToggle={onToggleReaction}
                            onAdd={onAddReaction}
                            compact
                        />
                    )}
                    {commentCount > 0 && (
                        <ThemedText type="caption" themeColor="textSecondary">
                            {commentCount} comment{commentCount !== 1 ? 's' : ''}
                        </ThemedText>
                    )}
                </View>
            )}

            <ImageViewer
                visible={viewerVisible}
                uri={photoUrl ?? null}
                onClose={() => setViewerVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Radius.md,
        gap: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    typeChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    photo: {
        height: 200,
        borderRadius: Radius.sm,
    },
    photoPlaceholder: {
        height: 100,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        fontSize: Typography.body,
        lineHeight: LineHeight.subtitle,
    },
    caption: {
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
