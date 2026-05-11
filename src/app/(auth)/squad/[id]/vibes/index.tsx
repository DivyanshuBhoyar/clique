import { ThemedText } from '@/components/themed-text';
import { EmptySectionCard } from '@/components/ui/empty-section-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { ConfessionFeed } from '@/components/vibes/confession-feed';
import { ConfessionInput } from '@/components/vibes/confession-input';
import { CreatePoll } from '@/components/vibes/create-poll';
import { PollCard } from '@/components/vibes/poll-card';
import { SquadVibeCard } from '@/components/vibes/squad-vibe-card';
import { VibePicker } from '@/components/vibes/vibe-picker';
import { WeeklyQuestionCard } from '@/components/vibes/weekly-question-card';
import { YourVibeCard } from '@/components/vibes/your-vibe-card';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { History, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 20;
const RECENT_POLLS_COUNT = 5;

export default function VibesScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;

    const [vibePickerVisible, setVibePickerVisible] = useState(false);
    const [showCreatePoll, setShowCreatePoll] = useState(false);

    const vibes = useQuery(api.vibes.getSquadVibes, squadId ? { squadId } : 'skip');
    const currentQuestion = useQuery(api.questions.getCurrentQuestion, squadId ? { squadId } : 'skip');
    const polls = useQuery(api.polls.getPolls, squadId ? { squadId } : 'skip');
    const currentUser = useQuery(api.users.current);
    const currentAvatarUrl = useQuery(api.users.currentAvatarUrl);

    const {
        results: confessions,
        loadMore: loadMoreConfessions,
        status: confessionsStatus,
    } = usePaginatedQuery(
        api.confessions.getConfessions,
        squadId ? { squadId } : 'skip',
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
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const myVibe = vibes?.find((v) => v.isCurrentUser);
    const squadVibes = vibes?.filter((v) => !v.isCurrentUser) ?? [];
    const recentPolls = polls?.slice(0, RECENT_POLLS_COUNT) ?? [];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={[]}>
            <ScreenHeader title="Vibes ✨" />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <YourVibeCard
                    userName={currentUser?.name}
                    avatarUrl={currentAvatarUrl}
                    vibe={myVibe?.vibe}
                    vibeLabel={myVibe?.vibeLabel ?? undefined}
                    onEdit={() => setVibePickerVisible(true)}
                />
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <ThemedText type="subtitle" style={{ fontWeight: Weight.bold }}>
                                Squad Vibes
                            </ThemedText>
                            <View style={[styles.activeDot, { backgroundColor: theme.success }]} />
                        </View>
                        {squadVibes.length > 0 && (
                            <ThemedText type="small" themeColor="textSecondary">
                                {squadVibes.length} active
                            </ThemedText>
                        )}
                    </View>

                    {vibes === undefined ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : squadVibes.length === 0 ? (
                        <EmptySectionCard
                            emoji="✨"
                            title="No squad vibes yet"
                            subtitle="Be the first to set a vibe!"
                        />
                    ) : (
                        <View style={styles.cardList}>
                            {squadVibes.map((member) => (
                                <SquadVibeCard key={member.userId} member={member} />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <SectionHeader emoji="❓" label="THIS WEEK'S Q" />
                    {currentQuestion !== undefined ? (
                        <WeeklyQuestionCard
                            question={currentQuestion.question}
                            answers={currentQuestion.answers}
                            myAnswer={currentQuestion.myAnswer}
                            answerCount={currentQuestion.answerCount}
                            squadMemberCount={currentQuestion.squadMemberCount}
                            currentUserId={currentUser?._id}
                            onAnswer={(questionId, content) =>
                                answerQuestion({ questionId: questionId as Id<'weeklyQuestions'>, content })
                            }
                            onCreateQuestion={(sId, question) =>
                                createQuestion({ squadId: sId as Id<'squads'>, question })
                            }
                            squadId={squadId}
                        />
                    ) : (
                        <ThemedText type="small" themeColor="textSecondary">Loading…</ThemedText>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <SectionHeader emoji="📊" label="POLLS" />
                        {!showCreatePoll && (
                            <TouchableOpacity
                                onPress={() => setShowCreatePoll(true)}
                                style={[styles.newPill, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                                hitSlop={8}
                            >
                                <Plus size={12} color={theme.text} strokeWidth={2.5} />
                                <ThemedText type="caption" style={{ color: theme.text, fontWeight: Weight.bold }}>
                                    New
                                </ThemedText>
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
                        recentPolls.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pollsScroll}
                            >
                                {recentPolls.map((poll) => (
                                    <PollCard
                                        key={poll._id}
                                        poll={poll}
                                        compact
                                        onVote={(pollId, optionId) =>
                                            votePoll({
                                                pollId: pollId as Id<'polls'>,
                                                optionId: optionId as Id<'pollOptions'>,
                                            })
                                        }
                                    />
                                ))}
                            </ScrollView>
                        ) : !showCreatePoll ? (
                            <EmptySectionCard
                                emoji="📊"
                                title="No polls yet"
                                subtitle="Create the first poll!"
                                onPress={() => setShowCreatePoll(true)}
                            />
                        ) : null
                    ) : (
                        <ThemedText type="small" themeColor="textSecondary">Loading…</ThemedText>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => router.push(`/squad/${squadId}/vibes/past` as any)}
                    style={[styles.historyCard, { backgroundColor: theme.surfaceAccent, borderColor: theme.outline }]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Open past vibe entries"
                >
                    <View style={[styles.historyIcon, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                        <History size={20} color={theme.text} strokeWidth={2.5} />
                    </View>
                    <View style={styles.historyText}>
                        <ThemedText type="smallBold">Past entries</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                            Revisit older questions and polls
                        </ThemedText>
                    </View>
                </TouchableOpacity>


                <View style={styles.section}>
                    <SectionHeader emoji="🤫" label="CONFESSIONS" />
                    <ConfessionInput onSubmit={(content) => createConfession({ squadId, content })} />
                    <ConfessionFeed
                        confessions={confessions}
                        onToggleReaction={(confessionId, emoji) =>
                            toggleConfessionReaction({
                                confessionId: confessionId as Id<'confessions'>,
                                emoji,
                            })
                        }
                        onLoadMore={() => loadMoreConfessions(PAGE_SIZE)}
                        hasMore={confessionsStatus === 'CanLoadMore'}
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
    container: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: 100,
        gap: Spacing.xxl,
    },
    section: { gap: Spacing.md },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    activeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    cardList: { gap: Spacing.md },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        minHeight: 64,
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    historyIcon: {
        width: 44,
        height: 44,
        borderWidth: 2,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyText: {
        flex: 1,
        gap: 2,
    },
    newPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.full,
        borderWidth: 1.5,
    },
    pollsScroll: {
        gap: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
});
