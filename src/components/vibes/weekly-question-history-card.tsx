import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, View } from 'react-native';

interface WeeklyQuestionHistoryCardProps {
    entry: {
        question: {
            _id: string;
            question: string;
            createdAt: number;
        };
        answers: {
            _id: string;
            content: string;
            nickname: string;
            avatarUrl?: string | null;
            userId: string;
        }[];
        myAnswer: { _id: string; content: string; userId: string } | null;
        answerCount: number;
        squadMemberCount: number;
    };
}

function formatEntryDate(timestamp: number): string {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(timestamp));
}

export function WeeklyQuestionHistoryCard({ entry }: WeeklyQuestionHistoryCardProps) {
    const theme = useTheme();
    const visibleAnswers = entry.answers.slice(0, 4);
    const hiddenCount = Math.max(entry.answers.length - visibleAnswers.length, 0);

    return (
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.metaRow}>
                <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: Weight.bold }}>
                    {formatEntryDate(entry.question.createdAt)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.countText}>
                    {entry.answerCount}/{entry.squadMemberCount} answered
                </ThemedText>
            </View>

            <ThemedText type="bodyBold" style={styles.question} selectable>
                {entry.question.question}
            </ThemedText>

            {entry.myAnswer ? (
                <View style={[styles.myAnswer, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                    <ThemedText type="caption" themeColor="textSecondary">
                        Your answer
                    </ThemedText>
                    <ThemedText type="small" selectable>
                        {entry.myAnswer.content}
                    </ThemedText>
                </View>
            ) : null}

            {visibleAnswers.length > 0 ? (
                <View style={styles.answers}>
                    {visibleAnswers.map((answer) => (
                        <View key={answer._id} style={styles.answerRow}>
                            <UserAvatar uri={answer.avatarUrl} size={22} fallbackText={answer.nickname} />
                            <View style={styles.answerText}>
                                <ThemedText type="caption" style={{ fontWeight: Weight.bold }} numberOfLines={1}>
                                    {answer.nickname}
                                </ThemedText>
                                <ThemedText type="small" themeColor="textSecondary" selectable>
                                    {answer.content}
                                </ThemedText>
                            </View>
                        </View>
                    ))}
                    {hiddenCount > 0 ? (
                        <ThemedText type="caption" themeColor="textSecondary">
                            +{hiddenCount} more answer{hiddenCount !== 1 ? 's' : ''}
                        </ThemedText>
                    ) : null}
                </View>
            ) : (
                <ThemedText type="small" themeColor="textSecondary">
                    Nobody answered this one.
                </ThemedText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    countText: {
        fontVariant: ['tabular-nums'],
    },
    question: {
        lineHeight: LineHeight.body,
    },
    myAnswer: {
        borderWidth: 1.5,
        borderRadius: Radius.md,
        padding: Spacing.sm,
        gap: Spacing.xs,
    },
    answers: {
        gap: Spacing.sm,
    },
    answerRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'flex-start',
    },
    answerText: {
        flex: 1,
        gap: 2,
    },
});
