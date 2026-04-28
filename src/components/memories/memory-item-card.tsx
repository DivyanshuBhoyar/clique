import { DropReactions } from '@/components/drops/drop-reactions';
import { ImageViewer } from '@/components/image-viewer';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

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
}: MemoryItemCardProps) {
    const theme = useTheme();
    const [viewerVisible, setViewerVisible] = useState(false);

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}>
            <View style={styles.metaRow}>
                <UserAvatar uri={avatarUrl} size={18} fallbackText={nickname} />
                <ThemedText type="caption" themeColor="textSecondary">
                    {nickname} · {formatRelativeTime(createdAt)}
                </ThemedText>
            </View>

            {type === 'photo' && (
                photoUrl ? (
                    <Pressable onPress={() => setViewerVisible(true)}>
                        <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
                    </Pressable>
                ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="small" themeColor="textSecondary">photo</ThemedText>
                    </View>
                )
            )}

            {type === 'link' ? (
                <View style={[styles.linkPreview, { backgroundColor: theme.backgroundElement, borderColor: theme.outlineLight }]}>
                    <ThemedText style={styles.linkTitle} numberOfLines={2}>{content}</ThemedText>
                    <ThemedText type="caption" themeColor="textTertiary">{getDomain(content)}</ThemedText>
                </View>
            ) : (
                <ThemedText style={styles.content}>{content}</ThemedText>
            )}

            {type === 'photo' && caption ? (
                <ThemedText type="caption" themeColor="textTertiary" style={styles.caption}>{caption}</ThemedText>
            ) : null}

            <View style={styles.footer}>
                <DropReactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={onToggleReaction}
                />
                {commentCount > 0 && (
                    <ThemedText type="caption" themeColor="textSecondary">
                        {commentCount} comment{commentCount !== 1 ? 's' : ''}
                    </ThemedText>
                )}
            </View>

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
        padding: Spacing.lg,
        borderWidth: 1.5,
        borderRadius: Radius.md,
        gap: Spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    photoPlaceholder: {
        height: 120,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    photo: {
        height: 200,
        borderRadius: Radius.sm,
        marginBottom: Spacing.xs,
    },
    content: {
        fontSize: 15,
        lineHeight: 22,
    },
    caption: {
        fontStyle: 'italic',
    },
    linkPreview: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    linkTitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
});
