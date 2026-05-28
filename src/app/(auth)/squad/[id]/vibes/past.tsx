import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { PollCard } from '@/components/vibes/poll-card';
import { WeeklyQuestionHistoryCard } from '@/components/vibes/weekly-question-history-card';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { backOrReplace } from '@/utils/navigation';

const RECENT_POLLS_COUNT = 5;

export default function PastVibesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;

    const pastQuestions = useQuery(
        api.questions.getPastWeeklyQuestions,
        squadId ? { squadId, limit: 50 } : 'skip',
    );
    const pastPolls = useQuery(
        api.polls.getPastPolls,
        squadId ? { squadId, recentCount: RECENT_POLLS_COUNT, limit: 50 } : 'skip',
    );
    const votePoll = useMutation(api.polls.votePoll);

    const isLoading = pastQuestions === undefined || pastPolls === undefined;
    const questionEntries = pastQuestions ?? [];
    const pollEntries = pastPolls ?? [];
    const hasEntries = questionEntries.length > 0 || pollEntries.length > 0;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader title="Past Vibes ✨" onBack={() => backOrReplace(router, `/squad/${squadId}/vibes`)} />

                {isLoading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                ) : (
                    <ScrollView
                        contentInsetAdjustmentBehavior="automatic"
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                    >
                        {!hasEntries ? (
                            <EmptyState
                                emoji="🗂️"
                                title="No past vibes yet"
                                subtitle="Weekly questions and older polls will land here once the squad has more history."
                            />
                        ) : null}

                        {questionEntries.length > 0 ? (
                            <View style={styles.section}>
                                <SectionHeader emoji="❓" label="PAST QUESTIONS" />
                                <View style={styles.cardList}>
                                    {questionEntries.map((entry) => (
                                        <WeeklyQuestionHistoryCard key={entry.question._id} entry={entry} />
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {pollEntries.length > 0 ? (
                            <View style={styles.section}>
                                <SectionHeader emoji="📊" label="OLDER POLLS" />
                                <View style={styles.cardList}>
                                    {pollEntries.map((poll) => (
                                        <PollCard
                                            key={poll._id}
                                            poll={poll}
                                            onVote={(pollId, optionId) =>
                                                votePoll({
                                                    pollId: pollId as Id<'polls'>,
                                                    optionId: optionId as Id<'pollOptions'>,
                                                })
                                            }
                                        />
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {hasEntries ? (
                            <View style={[styles.footerNote, { borderColor: theme.outlineLight }]}>
                                <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                                    Recent polls stay on the main vibes page. The rest live here so old answers are easy to revisit.
                                </ThemedText>
                            </View>
                        ) : null}
                    </ScrollView>
                )}
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: 100,
        gap: Spacing.xxl,
    },
    section: {
        gap: Spacing.md,
    },
    cardList: {
        gap: Spacing.md,
    },
    footerNote: {
        borderWidth: 1.5,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    footerText: {
        textAlign: 'center',
        fontWeight: Weight.medium,
    },
});
