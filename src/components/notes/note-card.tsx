/**
 * NoteCard — personal note / journal entry card in the list.
 *
 * Design from mockup:
 *   ┌──────────────────────────────────────────┐  ← white bg, 2px border, 16px radius
 *   │ 📌 pinned  [Personal 🔒 pill]  2 hrs ago │  ← header
 *   │ Bold title                               │
 *   │ Content preview...                       │  ← 1 line truncated
 *   └──────────────────────────────────────────┘
 *
 * The right edge gets a 4px accent-coloured left-border to differentiate
 * note type at a glance: warm yellow for journal, plain outline for personal.
 */
import { Pin } from 'lucide-react-native';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { markdownToPlainText } from '@/components/notes/markdown-preview';
import { ThemedText } from '@/components/themed-text';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { UserAvatar } from '@/components/user-avatar';
import { BorderWidth, LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface NoteCardProps {
    title: string;
    content: string;
    updatedAt: number;
    tag?: string;
    type: 'personal' | 'journal' | 'friend';
    pinned?: boolean;
    ownerNickname?: string;
    collaborators?: {
        userId: string;
        nickname: string;
        avatarUrl: string | null;
    }[];
    collaboratorCount?: number;
    onTogglePin?: (noteId: string) => void;
    noteId?: string;
}

const TYPE_LABEL: Record<string, string> = {
    personal: '🔒 Personal',
    journal: '📓 Journal',
    friend: '🫶 Friend',
};

const STRIP_COLORS = ['#F5C542', '#F28D79', '#A6C48A', '#B39DDB', '#F2C094'];

function colorForCardSeed(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return STRIP_COLORS[Math.abs(hash) % STRIP_COLORS.length];
}

export function NoteCard({
    title,
    content,
    updatedAt,
    tag,
    type,
    pinned,
    ownerNickname,
    collaborators,
    collaboratorCount,
    onTogglePin,
    noteId,
}: NoteCardProps) {
    const theme = useTheme();
    const time = formatRelativeTime(updatedAt);
    const isJournal = type === 'journal';
    const chipLabel = tag ?? TYPE_LABEL[type] ?? 'Note';
    const stripColor = isJournal ? theme.accent : colorForCardSeed(title || chipLabel);
    const plainPreview = markdownToPlainText(content);

    const previewCollaborators = collaborators?.length
        ? collaborators.slice(0, 3)
        : [{ userId: 'owner', nickname: ownerNickname ?? 'You', avatarUrl: null }];

    const totalCollaborators = collaboratorCount ?? previewCollaborators.length;
    const footerLabel =
        totalCollaborators > 1
            ? `${previewCollaborators[0]?.nickname ?? 'You'} +${totalCollaborators - 1}`
            : `${previewCollaborators[0]?.nickname ?? 'You'}`;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isJournal ? theme.surfaceWarm : theme.surface,
                    borderColor: theme.cardBorder,
                },
            ]}
        >
            <View style={[styles.leftStrip, { backgroundColor: stripColor }]} />

            <View style={styles.header}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.typeLabel}>
                    {chipLabel}
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
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingLeft: Spacing.xl,
        borderWidth: BorderWidth.thin,
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
        gap: Spacing.sm,
    },
    iconButton: {
        minWidth: 34,
        minHeight: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: {
        fontWeight: Weight.semibold,
    },
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
    preview: {
        lineHeight: LineHeight.small,
    },
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
    avatarSlot: {
        borderRadius: 999,
    },
    footerLabel: {
        fontWeight: Weight.bold,
        flexShrink: 1,
    },
});
