/**
 * MemoryItemCard — a single scrapbook item within an event memory.
 * Supports three types: reflection (text), photo (image + caption), link (URL preview).
 *
 * Design: white card, 2px border, Radius.md, EmojiReactionStrip at bottom.
 * Photo items show full-width image with tappable full-screen viewer.
 * Link items show a rounded preview box with domain.
 */
import { Image } from 'expo-image';
import { Link2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ImageViewer } from '@/components/image-viewer';
import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
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
                <View style={[styles.linkPreview, { backgroundColor: theme.backgroundElement, borderColor: theme.outlineLight }]}>
                    <Link2 size={13} color={theme.textTertiary} strokeWidth={2} />
                    <View style={styles.linkText}>
                        <ThemedText style={styles.linkTitle} numberOfLines={2}>{content}</ThemedText>
                        <ThemedText type="caption" themeColor="textTertiary">{getDomain(content)}</ThemedText>
                    </View>
                </View>
            ) : (
                <ThemedText style={styles.content}>{content}</ThemedText>
            )}

            {/* Photo caption */}
            {type === 'photo' && caption ? (
                <ThemedText type="caption" themeColor="textTertiary" style={styles.caption}>{caption}</ThemedText>
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
    linkPreview: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    linkText: {
        flex: 1,
        gap: 2,
    },
    linkTitle: {
        fontSize: Typography.small,
        lineHeight: LineHeight.small,
        fontWeight: Weight.medium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
