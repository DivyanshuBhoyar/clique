import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

interface WeeklyQuestionCardProps {
    question: {
        _id: string;
        question: string;
        createdAt: number;
    } | null;
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
    currentUserId?: string;
    onAnswer: (questionId: string, content: string) => void;
    onCreateQuestion: (squadId: string, question: string) => void;
    squadId: string;
}

export function WeeklyQuestionCard({
    question,
    answers,
    myAnswer,
    answerCount,
    squadMemberCount,
    onAnswer,
    onCreateQuestion,
    squadId,
}: WeeklyQuestionCardProps) {
    const theme = useTheme();
    const [answerText, setAnswerText] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [showNewQuestion, setShowNewQuestion] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState("");

    const progress = squadMemberCount > 0 ? answerCount / squadMemberCount : 0;
    const otherAnswers = answers.filter(
        (a) => !myAnswer || a.userId !== myAnswer.userId
    );

    function handleSubmitAnswer() {
        if (!question || !answerText.trim()) return;
        onAnswer(question._id as any, answerText.trim());
        setAnswerText("");
        setIsEditing(false);
    }

    function handleCreateQuestion() {
        if (!newQuestionText.trim()) return;
        onCreateQuestion(squadId as any, newQuestionText.trim());
        setNewQuestionText("");
        setShowNewQuestion(false);
    }

    if (!question) {
        return (
            <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
                <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                    THIS WEEK&apos;S QUESTION
                </ThemedText>

                {showNewQuestion ? (
                    <View style={styles.createSection}>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                            value={newQuestionText}
                            onChangeText={setNewQuestionText}
                            placeholder="Ask the squad something..."
                            placeholderTextColor={theme.textTertiary}
                            maxLength={200}
                            autoFocus
                        />
                        <View style={styles.createActions}>
                            <Pressable onPress={() => setShowNewQuestion(false)} hitSlop={8}>
                                <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                            </Pressable>
                    <Pressable
                        style={[styles.submitBtn, {
                            backgroundColor: newQuestionText.trim() ? theme.accent : theme.backgroundElement,
                            borderColor: newQuestionText.trim() ? theme.outline : theme.outlineLight,
                            opacity: newQuestionText.trim() ? 1 : 0.5,
                        }]}
                        onPress={handleCreateQuestion}
                        disabled={!newQuestionText.trim()}
                    >
                        <ThemedText type="smallBold" style={{ color: newQuestionText.trim() ? theme.text : theme.textTertiary }}>Post</ThemedText>
                    </Pressable>
                    </View>
                </View>
            ) : (
                    <Pressable onPress={() => setShowNewQuestion(true)} style={styles.emptyState}>
                        <ThemedText type="small" themeColor="textSecondary">
                            No question this week — post one!
                        </ThemedText>
                    </Pressable>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
            <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                THIS WEEK&apos;S QUESTION
            </ThemedText>

            <View style={styles.progressRow}>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                    <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.accent }]} />
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                    {answerCount}/{squadMemberCount}
                </ThemedText>
            </View>

            <ThemedText type="heading">{question.question}</ThemedText>

            {myAnswer && !isEditing ? (
                <Pressable onPress={() => { setIsEditing(true); setAnswerText(myAnswer.content); }}>
                    <View style={[styles.myAnswerBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                        <ThemedText type="caption" themeColor="textSecondary">Your answer:</ThemedText>
                        <ThemedText type="small">{myAnswer.content}</ThemedText>
                    </View>
                </Pressable>
            ) : (
                <View style={styles.answerInputRow}>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                        value={answerText}
                        onChangeText={setAnswerText}
                        placeholder="Your answer..."
                        placeholderTextColor={theme.textTertiary}
                        maxLength={500}
                        autoFocus={isEditing}
                    />
                    <Pressable
                        style={[styles.submitBtn, {
                            backgroundColor: answerText.trim() ? theme.accent : theme.backgroundElement,
                            borderColor: answerText.trim() ? theme.outline : theme.outlineLight,
                            opacity: answerText.trim() ? 1 : 0.5,
                        }]}
                        onPress={handleSubmitAnswer}
                        disabled={!answerText.trim()}
                    >
                        <ThemedText type="smallBold" style={{ color: answerText.trim() ? theme.text : theme.textTertiary }}>
                            {myAnswer ? 'Update' : 'Send'}
                        </ThemedText>
                    </Pressable>
                </View>
            )}

            {otherAnswers.length > 0 && (
                <View style={styles.answersList}>
                    {otherAnswers.map((answer) => (
                        <View key={answer._id} style={styles.answerItem}>
                            <View style={styles.answerHeader}>
                                <UserAvatar uri={answer.avatarUrl} size={18} fallbackText={answer.nickname} />
                                <ThemedText type="smallBold">{answer.nickname}:</ThemedText>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary">
                                {" "}{answer.content}
                            </ThemedText>
                        </View>
                    ))}
                </View>
            )}
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
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    myAnswerBox: {
        padding: Spacing.sm,
        borderRadius: Radius.md,
        gap: Spacing.xs,
        borderWidth: 1.5,
    },
    answerInputRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "center",
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.sm,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.small,
    },
    submitBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    answersList: {
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    answerItem: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: Spacing.xs,
    },
    answerHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    emptyState: {
        paddingVertical: Spacing.lg,
        alignItems: "center",
    },
    createSection: {
        gap: Spacing.sm,
    },
    createActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});
