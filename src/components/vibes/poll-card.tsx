import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Pressable, StyleSheet, View } from 'react-native';

interface PollOption {
    _id: string;
    text: string;
    votes: number;
}

interface PollData {
    _id: string;
    question: string;
    options: PollOption[];
    totalVotes: number;
    myVoteOptionId: string | null;
    createdAt: number;
    expiresAt?: number;
}

interface PollCardProps {
    poll: PollData;
    onVote: (pollId: string, optionId: string) => void;
    compact?: boolean;
}

function formatPollExpiry(expiresAt?: number) {
    if (!expiresAt) return null;

    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Closed';

    const minutes = Math.ceil(diff / (1000 * 60));
    if (minutes < 60) return `Closes in ${minutes}m`;

    const hours = Math.ceil(minutes / 60);
    if (hours < 24) return `Closes in ${hours}h`;

    const days = Math.ceil(hours / 24);
    return `Closes in ${days}d`;
}

export function PollCard({ poll, onVote, compact }: PollCardProps) {
    const theme = useTheme();
    const hasVoted = poll.myVoteOptionId !== null;
    const expiryLabel = formatPollExpiry(poll.expiresAt);
    const isClosed = Boolean(poll.expiresAt && poll.expiresAt <= Date.now());

    return (
        <View style={[styles.container, compact && styles.compact, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
            <View style={styles.questionRow}>
                <ThemedText style={styles.pollEmoji}>📊</ThemedText>
                <ThemedText type="bodyBold" numberOfLines={compact ? 2 : undefined} style={{ flex: 1 }}>
                    {poll.question}
                </ThemedText>
            </View>
            <View style={styles.metaRow}>
                <ThemedText type="caption" themeColor="textSecondary">
                    {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
                </ThemedText>
                {expiryLabel ? (
                    <View
                        style={[
                            styles.expiryChip,
                            {
                                borderColor: isClosed ? theme.outlineLight : theme.accent,
                                backgroundColor: isClosed ? theme.backgroundElement : theme.accentSoft,
                            },
                        ]}
                    >
                        <ThemedText
                            type="captionBold"
                            style={{ color: isClosed ? theme.textSecondary : theme.text }}
                        >
                            {expiryLabel}
                        </ThemedText>
                    </View>
                ) : null}
            </View>

            <View style={styles.options}>
                {poll.options.map((option) => {
                    const isMyVote = poll.myVoteOptionId === option._id;
                    const percentage = poll.totalVotes > 0
                        ? Math.round((option.votes / poll.totalVotes) * 100)
                        : 0;

                    return (
                        <Pressable
                            key={option._id}
                            style={[
                                styles.optionRow,
                                {
                                    borderColor: isMyVote ? theme.accent : theme.outlineLight,
                                    borderWidth: isMyVote ? 2 : 1.5,
                                    backgroundColor: theme.surface,
                                },
                            ]}
                            onPress={() => {
                                if (!isClosed) onVote(poll._id, option._id);
                            }}
                            disabled={isClosed}
                            accessibilityRole="button"
                            accessibilityLabel={isClosed ? `Poll closed: ${option.text}` : `Vote for ${option.text}`}
                        >
                            {hasVoted && (
                                <View
                                    style={[
                                        styles.optionFill,
                                        {
                                            width: `${percentage}%` as any,
                                            backgroundColor: isMyVote ? theme.accentSoft : theme.backgroundElement,
                                        },
                                    ]}
                                />
                            )}

                            <View style={styles.optionContent}>
                                <ThemedText
                                    type="small"
                                    numberOfLines={1}
                                    style={isMyVote ? { fontWeight: Weight.bold } : undefined}
                                >
                                    {option.text}
                                </ThemedText>
                                {hasVoted && (
                                    <ThemedText type="caption" themeColor="textSecondary">
                                        {percentage}%
                                    </ThemedText>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    compact: {
        width: 280,
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
    },
    pollEmoji: {
        fontSize: Typography.body,
        marginTop: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    expiryChip: {
        borderWidth: 1.5,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    options: {
        gap: Spacing.sm,
    },
    optionRow: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
        minHeight: 44,
        justifyContent: 'center',
    },
    optionFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
    },
    optionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
});
