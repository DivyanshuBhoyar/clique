import { SquadHeader } from "@/components/squad-header";
import { ThemedText } from "@/components/themed-text";
import { ConfessionFeed } from "@/components/vibes/confession-feed";
import { ConfessionInput } from "@/components/vibes/confession-input";
import { CreatePoll } from "@/components/vibes/create-poll";
import { DailyVibesRow } from "@/components/vibes/daily-vibes-row";
import { PollCard } from "@/components/vibes/poll-card";
import { VibePicker } from "@/components/vibes/vibe-picker";
import { WeeklyQuestionCard } from "@/components/vibes/weekly-question-card";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const PAGE_SIZE = 20;

export default function VibesScreen() {
    const theme = useTheme();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === "string" ? id : undefined) as Id<"squads"> | undefined;

    const [vibePickerVisible, setVibePickerVisible] = useState(false);
    const [showCreatePoll, setShowCreatePoll] = useState(false);

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const vibes = useQuery(api.vibes.getSquadVibes, squadId ? { squadId } : "skip");
    const currentQuestion = useQuery(api.questions.getCurrentQuestion, squadId ? { squadId } : "skip");
    const polls = useQuery(api.polls.getPolls, squadId ? { squadId } : "skip");
    const currentUser = useQuery(api.users.current);
    const currentAvatarUrl = useQuery(api.users.currentAvatarUrl);

    const {
        results: confessions,
        loadMore: loadMoreConfessions,
        status: confessionsStatus,
    } = usePaginatedQuery(
        api.confessions.getConfessions,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const setVibe = useMutation(api.vibes.setVibe);
    const clearVibe = useMutation(api.vibes.clearVibe);
    const answerQuestion = useMutation(api.questions.answerWeeklyQuestion);
    const createQuestion = useMutation(api.questions.createWeeklyQuestion);
    const createConfession = useMutation(api.confessions.createConfession);
    const toggleConfessionReaction = useMutation(api.confessions.toggleConfessionReaction);
    const createPoll = useMutation(api.polls.createPoll);
    const votePoll = useMutation(api.polls.votePoll);

    if (!squadId) {
        return (
            <View style={[styles.container, styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <SquadHeader name={squad?.name} disabled />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Daily Vibes */}
                <View style={styles.section}>
                    {vibes ? (
                        <DailyVibesRow
                            vibes={vibes}
                            currentUserId={currentUser?._id}
                            onCurrentUserPress={() => setVibePickerVisible(true)}
                        />
                    ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                            Loading vibes...
                        </ThemedText>
                    )}
                </View>

                {/* Weekly Question */}
                <View style={styles.section}>
                    {currentQuestion !== undefined ? (
                        <WeeklyQuestionCard
                            question={currentQuestion.question}
                            answers={currentQuestion.answers}
                            myAnswer={currentQuestion.myAnswer}
                            answerCount={currentQuestion.answerCount}
                            squadMemberCount={currentQuestion.squadMemberCount}
                            currentUserId={currentUser?._id}
                            onAnswer={(questionId, content) => answerQuestion({ questionId: questionId as Id<"weeklyQuestions">, content })}
                            onCreateQuestion={(sId, question) => createQuestion({ squadId: sId as Id<"squads">, question })}
                            squadId={squadId}
                        />
                    ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                            Loading question...
                        </ThemedText>
                    )}
                </View>

                {/* Polls */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                            POLLS
                        </ThemedText>
                        {!showCreatePoll && (
                            <TouchableOpacity onPress={() => setShowCreatePoll(true)}>
                                <ThemedText type="small" themeColor="accent">+ New</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showCreatePoll && (
                        <CreatePoll
                            onSubmit={(question, options) => {
                                createPoll({ squadId, question, options });
                                setShowCreatePoll(false);
                            }}
                            onCancel={() => setShowCreatePoll(false)}
                        />
                    )}

                    {polls !== undefined ? (
                        polls.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pollsScroll}
                            >
                                {polls.map((poll) => (
                                    <PollCard
                                        key={poll._id}
                                        poll={poll}
                                        compact
                                        onVote={(pollId, optionId) =>
                                            votePoll({ pollId: pollId as Id<"polls">, optionId: optionId as Id<"pollOptions"> })
                                        }
                                    />
                                ))}
                            </ScrollView>
                        ) : !showCreatePoll ? (
                            <TouchableOpacity
                                onPress={() => setShowCreatePoll(true)}
                                style={[styles.emptyCard, { borderColor: theme.outline }]}
                            >
                                <ThemedText type="small" themeColor="textSecondary">
                                    No polls yet — create one!
                                </ThemedText>
                            </TouchableOpacity>
                        ) : null
                    ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                            Loading polls...
                        </ThemedText>
                    )}
                </View>

                {/* Confessions */}
                <View style={styles.section}>
                    <ThemedText type="caption" style={{ letterSpacing: 1, color: theme.textSecondary }}>
                        CONFESSIONS
                    </ThemedText>
                    <ConfessionInput onSubmit={(content) => createConfession({ squadId, content })} />
                    <ConfessionFeed
                        confessions={confessions}
                        onToggleReaction={(confessionId, emoji) =>
                            toggleConfessionReaction({ confessionId: confessionId as Id<"confessions">, emoji })
                        }
                        onLoadMore={() => loadMoreConfessions(PAGE_SIZE)}
                        hasMore={confessionsStatus === "CanLoadMore"}
                    />
                </View>
            </ScrollView>

            <VibePicker
                visible={vibePickerVisible}
                onClose={() => setVibePickerVisible(false)}
                onSelect={(emoji, label) => setVibe({ squadId, emoji, label })}
                onClear={() => clearVibe({ squadId })}
                currentAvatarUrl={currentAvatarUrl ?? undefined}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        padding: Spacing.lg,
        gap: Spacing.xxl,
        paddingBottom: Spacing.six,
    },
    section: {
        gap: Spacing.sm,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    pollsScroll: {
        gap: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    emptyCard: {
        borderWidth: 2,
        borderRadius: 12,
        padding: Spacing.lg,
        alignItems: "center",
    },
});
