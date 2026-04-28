import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface WeeklyQuestionCardProps {
    question: {
        _id: string;
        question: string;
        createdAt: number;
    } | null;
    answers: Array<{
        _id: string;
        content: string;
        nickname: string;
        avatarUrl?: string | null;
        userId: string;
    }>;
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
                            <TouchableOpacity onPress={() => setShowNewQuestion(false)}>
                                <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: newQuestionText.trim() ? 1 : 0.4 }]}
                                onPress={handleCreateQuestion}
                                disabled={!newQuestionText.trim()}
                            >
                                <ThemedText type="smallBold" style={{ color: "#fff" }}>Post</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setShowNewQuestion(true)} style={styles.emptyState}>
                        <ThemedText type="small" themeColor="textSecondary">
                            No question this week — post one!
                        </ThemedText>
                    </TouchableOpacity>
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
                <TouchableOpacity onPress={() => { setIsEditing(true); setAnswerText(myAnswer.content); }}>
                    <View style={[styles.myAnswerBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                        <ThemedText type="caption" themeColor="textSecondary">Your answer:</ThemedText>
                        <ThemedText type="small">{myAnswer.content}</ThemedText>
                    </View>
                </TouchableOpacity>
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
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: answerText.trim() ? 1 : 0.4 }]}
                        onPress={handleSubmitAnswer}
                        disabled={!answerText.trim()}
                    >
                        <ThemedText type="smallBold" style={{ color: "#fff" }}>
                            {myAnswer ? "Update" : "Send"}
                        </ThemedText>
                    </TouchableOpacity>
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
        borderRadius: Radius.md,
        padding: Spacing.sm,
        fontSize: 14,
    },
    submitBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
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
