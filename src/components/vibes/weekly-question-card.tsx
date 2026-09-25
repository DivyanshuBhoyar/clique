import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { ConfirmDialog } from '@/components/ui';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
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
        askerNickname?: string | null;
    } | null;
    canPostNew: boolean;
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
    onAnswer: (questionId: string, content: string) => void;
    onDeleteAnswer: (answerId: string) => void;
    onCreateQuestion: (squadId: string, question: string) => void;
    onUpdateQuestion: (questionId: string, question: string) => void;
    onDeleteQuestion: (questionId: string) => void;
    squadId: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PASS_TEXT = "I'll pass this time 🤷";

export function WeeklyQuestionCard({
    question,
    canPostNew,
    answers,
    myAnswer,
    answerCount,
    squadMemberCount,
    onAnswer,
    onDeleteAnswer,
    onCreateQuestion,
    onUpdateQuestion,
    onDeleteQuestion,
    squadId,
}: WeeklyQuestionCardProps) {
    const theme = useTheme();
    const [answerText, setAnswerText] = useState("");
    const [isEditingAnswer, setIsEditingAnswer] = useState(false);
    const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState("");
    const [isEditingQuestion, setIsEditingQuestion] = useState(false);
    const [questionEditText, setQuestionEditText] = useState("");
    const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false);
    const [showDeleteAnswerConfirm, setShowDeleteAnswerConfirm] = useState(false);

    const progress = squadMemberCount > 0 ? answerCount / squadMemberCount : 0;
    const otherAnswers = answers.filter((a) => !myAnswer || a.userId !== myAnswer.userId);
    // Gate hint: only relevant when canPostNew is false and question exists
    const WEEK_THRESHOLD = question ? Math.floor(squadMemberCount / 2) + 1 : 0;
    const daysLeft = question
        ? Math.max(0, Math.ceil((question.createdAt + WEEK_MS - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    function handleSubmitAnswer() {
        if (!question || !answerText.trim()) return;
        onAnswer(question._id, answerText.trim());
        setAnswerText("");
        setIsEditingAnswer(false);
    }

    function handlePass() {
        if (!question) return;
        onAnswer(question._id, PASS_TEXT);
    }

    function handleCreateQuestion() {
        if (!newQuestionText.trim()) return;
        onCreateQuestion(squadId, newQuestionText.trim());
        setNewQuestionText("");
        setShowNewQuestionForm(false);
    }

    function handleUpdateQuestion() {
        if (!question || !questionEditText.trim()) return;
        onUpdateQuestion(question._id, questionEditText.trim());
        setIsEditingQuestion(false);
        setQuestionEditText("");
    }

    // ─── Case 1: New question form (shown over both null and active question) ───
    if (showNewQuestionForm) {
        return (
            <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
                <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                    THIS WEEK&apos;S QUESTION
                </ThemedText>

                {question && (
                    <ThemedText
                        type="caption"
                        themeColor="textTertiary"
                        style={{ fontSize: Typography.caption }}
                    >
                        {question.question}
                    </ThemedText>
                )}

                <View style={styles.createSection}>
                    <TextInput
                        style={[styles.input, {
                            color: theme.text,
                            borderColor: theme.outline,
                            backgroundColor: theme.inputBackground,
                        }]}
                        value={newQuestionText}
                        onChangeText={setNewQuestionText}
                        placeholder="Ask the squad something..."
                        placeholderTextColor={theme.textTertiary}
                        maxLength={300}
                        autoFocus
                    />
                    <ThemedText type="caption" themeColor="textTertiary" style={styles.charCounter}>
                        {newQuestionText.length}/300
                    </ThemedText>
                    <View style={styles.createActions}>
                        <Pressable
                            onPress={() => setShowNewQuestionForm(false)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel new question"
                        >
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
                            accessibilityRole="button"
                            accessibilityLabel="Post new question"
                        >
                            <ThemedText
                                type="smallBold"
                                style={{ color: newQuestionText.trim() ? theme.text : theme.textTertiary }}
                            >
                                Post
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    // ─── Case 2: No question yet ────────────────────────────────────────────────
    if (!question) {
        return (
            <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
                <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                    THIS WEEK&apos;S QUESTION
                </ThemedText>
                <Pressable
                    onPress={() => setShowNewQuestionForm(true)}
                    style={styles.emptyState}
                    accessibilityRole="button"
                    accessibilityLabel="Post a question for this week"
                >
                    <ThemedText type="small" themeColor="textSecondary">
                        No question this week — post one!
                    </ThemedText>
                </Pressable>
            </View>
        );
    }

    // ─── Case 3: Question exists ────────────────────────────────────────────────
    return (
        <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>

            {/* Header row */}
            <View style={styles.headerRow}>
                <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                    THIS WEEK&apos;S QUESTION
                </ThemedText>

                <View style={styles.headerActions}>
                    {!isEditingQuestion && (
                        <>
                            <Pressable
                                onPress={() => {
                                    setIsEditingQuestion(true);
                                    setQuestionEditText(question.question);
                                }}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Edit question"
                            >
                                <Pencil size={14} color={theme.textSecondary} />
                            </Pressable>
                            <Pressable
                                onPress={() => setShowDeleteQuestionConfirm(true)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Delete question"
                            >
                                <Trash2 size={14} color={theme.textSecondary} />
                            </Pressable>
                        </>
                    )}

                    {canPostNew ? (
                        <Pressable
                            style={[styles.newQPill, {
                                backgroundColor: theme.accent,
                                borderColor: theme.outline,
                            }]}
                            onPress={() => setShowNewQuestionForm(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Post a new question"
                        >
                            <Plus size={12} color={theme.text} />
                            <ThemedText type="caption">New Q</ThemedText>
                        </Pressable>
                    ) : (
                        <ThemedText type="caption" themeColor="textTertiary">
                            {answerCount}/{WEEK_THRESHOLD} answered · {daysLeft}d left
                        </ThemedText>
                    )}
                </View>
            </View>

            {/* Progress row */}
            <View style={styles.progressRow}>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${Math.round(progress * 100)}%`,
                                backgroundColor: theme.accent,
                            },
                        ]}
                    />
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                    {answerCount}/{squadMemberCount}
                </ThemedText>
            </View>

            {/* Question section */}
            {isEditingQuestion ? (
                <View style={styles.createSection}>
                    <TextInput
                        style={[styles.input, {
                            color: theme.text,
                            borderColor: theme.outline,
                            backgroundColor: theme.inputBackground,
                        }]}
                        value={questionEditText}
                        onChangeText={setQuestionEditText}
                        placeholder="Edit question..."
                        placeholderTextColor={theme.textTertiary}
                        maxLength={300}
                        autoFocus
                    />
                    <ThemedText type="caption" themeColor="textTertiary" style={styles.charCounter}>
                        {questionEditText.length}/300
                    </ThemedText>
                    <View style={styles.createActions}>
                        <Pressable
                            onPress={() => {
                                setIsEditingQuestion(false);
                                setQuestionEditText("");
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing question"
                        >
                            <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                        </Pressable>
                        <Pressable
                            style={[styles.submitBtn, {
                                backgroundColor: questionEditText.trim() ? theme.accent : theme.backgroundElement,
                                borderColor: questionEditText.trim() ? theme.outline : theme.outlineLight,
                                opacity: questionEditText.trim() ? 1 : 0.5,
                            }]}
                            onPress={handleUpdateQuestion}
                            disabled={!questionEditText.trim()}
                            accessibilityRole="button"
                            accessibilityLabel="Save question edits"
                        >
                            <ThemedText
                                type="smallBold"
                                style={{ color: questionEditText.trim() ? theme.text : theme.textTertiary }}
                            >
                                Save
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <View style={{ gap: Spacing.xs }}>
                    <ThemedText type="heading">{question.question}</ThemedText>
                    {question.askerNickname && (
                        <ThemedText type="caption" themeColor="textTertiary">
                            Asked by {question.askerNickname}
                        </ThemedText>
                    )}
                </View>
            )}

            {/* Answer section */}
            {isEditingAnswer ? (
                <View style={styles.createSection}>
                    <TextInput
                        style={[styles.input, {
                            color: theme.text,
                            borderColor: theme.outline,
                            backgroundColor: theme.inputBackground,
                        }]}
                        value={answerText}
                        onChangeText={setAnswerText}
                        placeholder="Your answer..."
                        placeholderTextColor={theme.textTertiary}
                        maxLength={500}
                        autoFocus
                    />
                    <View style={styles.createActions}>
                        <Pressable
                            onPress={() => {
                                setIsEditingAnswer(false);
                                setAnswerText("");
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing answer"
                        >
                            <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                        </Pressable>
                        <Pressable
                            style={[styles.submitBtn, {
                                backgroundColor: answerText.trim() ? theme.accent : theme.backgroundElement,
                                borderColor: answerText.trim() ? theme.outline : theme.outlineLight,
                                opacity: answerText.trim() ? 1 : 0.5,
                            }]}
                            onPress={handleSubmitAnswer}
                            disabled={!answerText.trim()}
                            accessibilityRole="button"
                            accessibilityLabel="Update answer"
                        >
                            <ThemedText
                                type="smallBold"
                                style={{ color: answerText.trim() ? theme.text : theme.textTertiary }}
                            >
                                Update
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            ) : myAnswer ? (
                <View style={[styles.myAnswerBox, {
                    backgroundColor: theme.accentSoft,
                    borderColor: theme.accent,
                }]}>
                    <View style={styles.myAnswerHeader}>
                        <ThemedText
                            type="caption"
                            style={{ flex: 1, color: theme.textSecondary }}
                        >
                            Your answer
                        </ThemedText>
                        <Pressable
                            onPress={() => {
                                setIsEditingAnswer(true);
                                setAnswerText(myAnswer.content);
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Edit your answer"
                        >
                            <Pencil size={12} color={theme.textSecondary} />
                        </Pressable>
                        <Pressable
                            onPress={() => setShowDeleteAnswerConfirm(true)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Delete your answer"
                        >
                            <Trash2 size={12} color={theme.textSecondary} />
                        </Pressable>
                    </View>
                    <ThemedText type="small">{myAnswer.content}</ThemedText>
                </View>
            ) : (
                <View>
                    <TextInput
                        style={[styles.input, {
                            color: theme.text,
                            borderColor: theme.outline,
                            backgroundColor: theme.inputBackground,
                        }]}
                        value={answerText}
                        onChangeText={setAnswerText}
                        placeholder="Your answer..."
                        placeholderTextColor={theme.textTertiary}
                        maxLength={500}
                    />
                    <View style={styles.answerActionRow}>
                        <Pressable
                            style={[styles.passBtn, {
                                backgroundColor: theme.backgroundElement,
                                borderColor: theme.outline,
                            }]}
                            onPress={handlePass}
                            accessibilityRole="button"
                            accessibilityLabel="Pass on this question"
                        >
                            <ThemedText type="smallBold" themeColor="textSecondary">Pass 🤷</ThemedText>
                        </Pressable>
                        <Pressable
                            style={[styles.submitBtn, {
                                backgroundColor: answerText.trim() ? theme.accent : theme.backgroundElement,
                                borderColor: answerText.trim() ? theme.outline : theme.outlineLight,
                                opacity: answerText.trim() ? 1 : 0.5,
                            }]}
                            onPress={handleSubmitAnswer}
                            disabled={!answerText.trim()}
                            accessibilityRole="button"
                            accessibilityLabel="Submit answer"
                        >
                            <ThemedText
                                type="smallBold"
                                style={{ color: answerText.trim() ? theme.text : theme.textTertiary }}
                            >
                                Send
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Other answers */}
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

            {/* Delete question confirmation */}
            <ConfirmDialog
                visible={showDeleteQuestionConfirm}
                title="Delete question?"
                message="This will remove the question and all answers. Cannot be undone."
                confirmLabel="Delete"
                destructive
                onConfirm={() => {
                    onDeleteQuestion(question._id);
                    setShowDeleteQuestionConfirm(false);
                }}
                onCancel={() => setShowDeleteQuestionConfirm(false)}
            />

            {/* Delete answer confirmation */}
            <ConfirmDialog
                visible={showDeleteAnswerConfirm}
                title="Delete your answer?"
                message="Your answer will be removed from this question."
                confirmLabel="Delete"
                destructive
                onConfirm={() => {
                    if (myAnswer) onDeleteAnswer(myAnswer._id);
                    setShowDeleteAnswerConfirm(false);
                }}
                onCancel={() => setShowDeleteAnswerConfirm(false)}
            />
        </View>
    );
}

// Suppress unused-import warning for Weight — kept for design-token consistency
// and future use within this file.
void (Weight as unknown);

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    // ── New entries ──────────────────────────────────────────────────────────
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    newQPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderWidth: 1.5,
    },
    myAnswerHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    answerActionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.xs,
    },
    passBtn: {
        borderRadius: Radius.full,
        borderWidth: 1.5,
        minHeight: 44,
        paddingHorizontal: Spacing.md,
        alignItems: "center",
        justifyContent: "center",
    },
    charCounter: {
        textAlign: "right",
    },
    // ── Preserved entries ────────────────────────────────────────────────────
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
    input: {
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
