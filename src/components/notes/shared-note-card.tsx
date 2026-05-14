/**
 * SharedNoteCard — squad collaborative note card.
 *
 * Visual distinction from personal NoteCard:
 *  - "Shared 🤝" pill (golden yellow accent border)
 *  - Collaborator "edited by @name" shown as italic caption
 *  - 2-line content preview
 */
import { Bookmark, Pin } from 'lucide-react-native';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { markdownToPlainText } from '@/components/notes/markdown-preview';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface SharedNoteCardProps {
    title: string;
    content: string;
    updatedAt: number;
    tag?: string;
    pinned?: boolean;
    ownerNickname?: string;
    collaborators?: {
        userId: string;
        nickname: string;
        avatarUrl: string | null;
    }[];
    collaboratorCount?: number;
    isBookmarked?: boolean;
    onToggleBookmark?: (noteId: string) => void;
    onTogglePin?: (noteId: string) => void;
    noteId?: string;
}

export function SharedNoteCard({
    title,
    content,
    updatedAt,
    tag,
    pinned,
    ownerNickname,
    collaborators,
    collaboratorCount,
    isBookmarked,
    onToggleBookmark,
    onTogglePin,
    noteId,
}: SharedNoteCardProps) {
    const theme = useTheme();
    const time = formatRelativeTime(updatedAt);
    const previewCollaborators = collaborators?.length
        ? collaborators.slice(0, 3)
        : [{ userId: 'owner', nickname: ownerNickname ?? 'Squad', avatarUrl: null }];
    const totalCollaborators = collaboratorCount ?? previewCollaborators.length;
    const plainPreview = markdownToPlainText(content);
    const footerLabel =
        totalCollaborators > 1
            ? `${previewCollaborators[0]?.nickname ?? 'Squad'} +${totalCollaborators - 1}`
            : `${previewCollaborators[0]?.nickname ?? 'Squad'}`;

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}> 
            <View style={[styles.leftStrip, { backgroundColor: '#F5C542' }]} />

            <View style={styles.header}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.typeLabel}>
                    {tag ?? '🤝 Shared'}
                </ThemedText>
                <View style={styles.headerRight}>
                    {pinned ? (
                        <View style={[styles.pinnedBadge, { backgroundColor: theme.accentSoft, borderColor: theme.outline }]}>
                            <Pin size={10} color={theme.accent} fill={theme.accent} strokeWidth={2} />
                            <ThemedText type="caption" style={{ color: theme.text, fontWeight: Weight.bold }}>
                                pinned
                            </ThemedText>
                        </View>
                    ) : null}
                    {onTogglePin && noteId ? (
                        <Pressable
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onTogglePin(noteId); }}
                            hitSlop={8}
                            style={styles.iconButton}
                            accessibilityRole="button"
                            accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
                        >
                            <Pin
                                size={16}
                                color={pinned ? theme.accent : theme.textSecondary}
                                fill={pinned ? theme.accent : 'none'}
                                strokeWidth={2}
                            />
                        </Pressable>
                    ) : null}
                    {onToggleBookmark && noteId ? (
                        <Pressable
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onToggleBookmark(noteId); }}
                            hitSlop={8}
                            style={styles.iconButton}
                            accessibilityRole="button"
                            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                            <Bookmark
                                size={16}
                                color={isBookmarked ? theme.accent : theme.textSecondary}
                                fill={isBookmarked ? theme.accent : 'none'}
                                strokeWidth={2}
                            />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            <ThemedText numberOfLines={1} style={styles.title}>
                {title || 'Untitled'}
            </ThemedText>

            {plainPreview ? (
                <ThemedText numberOfLines={2} type="small" themeColor="textSecondary" style={styles.preview}>
                    {plainPreview}
                </ThemedText>
            ) : null}

            <DashedSeparator marginVertical={Spacing.xs} />

            <View style={styles.footer}>
                <View style={styles.footerMeta}>
                    <View style={styles.avatarStack}>
                        {previewCollaborators.slice(0, 3).map((collaborator, index) => (
                            <View key={`${collaborator.userId}-${index}`} style={[styles.avatarSlot, { marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }]}> 
                                <UserAvatar
                                    uri={collaborator.avatarUrl}
                                    size={24}
                                    fallbackText={collaborator.nickname}
                                />
                            </View>
                        ))}
                    </View>
                    <ThemedText type="small" style={styles.footerLabel} numberOfLines={1}>
                        {footerLabel}
                    </ThemedText>
                </View>

                <ThemedText type="small" themeColor="textTertiary">
                    {time}
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        paddingLeft: Spacing.xl,
        borderWidth: 2,
        borderRadius: Radius.lg,
        gap: Spacing.xs,
        overflow: 'hidden',
    },
    leftStrip: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        minWidth: 34,
        minHeight: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: { fontWeight: Weight.semibold },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
        borderWidth: 1.5,
    },
    title: {
        fontSize: Typography.body,
        fontWeight: Weight.extrabold,
    },
    preview: { lineHeight: LineHeight.small },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
    },
    footerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarSlot: { borderRadius: 999 },
    footerLabel: {
        fontWeight: Weight.bold,
        flexShrink: 1,
    },
});
