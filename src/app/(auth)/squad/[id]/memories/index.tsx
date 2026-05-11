import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventList } from '@/components/memories/event-list';
import { WallList } from '@/components/memories/wall-list';
import { ThemedView } from '@/components/themed-view';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { Fab } from '@/components/ui/fab';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useBookmarkToggle } from '@/hooks/use-bookmark-mutation';
import { useReactionPicker } from '@/hooks/use-reaction-picker';

const PAGE_SIZE = 20;
const TABS = ['Wall', 'Events'] as const;

export default function MemoriesScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<number>(0);

    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.memories.toggleMemoryReaction);
    const bookmarkToggle = useBookmarkToggle();

    const wallQuery = usePaginatedQuery(
        api.memories.getWallMemories,
        squadId ? { squadId } : 'skip',
        { initialNumItems: PAGE_SIZE },
    );
    const eventQuery = usePaginatedQuery(
        api.memories.getEventMemories,
        squadId ? { squadId } : 'skip',
        { initialNumItems: PAGE_SIZE },
    );

    const handleToggleReaction = useCallback(
        (memoryId: string, emoji: string) => {
            toggleReaction({ memoryId: memoryId as Id<'memories'>, emoji });
        },
        [toggleReaction],
    );

    const reactionPicker = useReactionPicker(handleToggleReaction, 'React to memory');

    const isLoading = activeTab === 0 ? wallQuery.results === undefined : eventQuery.results === undefined;

    if (isLoading) {
        return <LoadingState />;
    }

    const fabType = activeTab === 1 ? 'event' : 'wall';

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Memories 🧠"
                    rightIcon={Plus}
                    onRightPress={() =>
                        router.push(`/squad/${squadId}/memories/new?type=${fabType}` as any)
                    }
                />

                <SegmentedControl
                    tabs={TABS as unknown as string[]}
                    activeIndex={activeTab}
                    onSelect={setActiveTab}
                    variant="underline"
                />

                {activeTab === 0 ? (
                    <WallList
                        items={wallQuery.results ?? []}
                        status={wallQuery.status}
                        loadMore={wallQuery.loadMore}
                        squadId={squadId}
                        currentUserId={currentUser?._id}
                        onToggleReaction={handleToggleReaction}
                        onAddReaction={reactionPicker.openPicker}
                        onToggleBookmark={(memoryId) => bookmarkToggle({ targetType: "memory", memoryId: memoryId as any })}
                    />
                ) : (
                    <EventList
                        items={eventQuery.results ?? []}
                        status={eventQuery.status}
                        loadMore={eventQuery.loadMore}
                        squadId={squadId}
                        currentUserId={currentUser?._id}
                        onToggleReaction={handleToggleReaction}
                        onAddReaction={reactionPicker.openPicker}
                        onToggleBookmark={(memoryId) => bookmarkToggle({ targetType: "memory", memoryId: memoryId as any })}
                    />
                )}

                <Fab
                    accessibilityLabel="Add memory"
                    onPress={() => router.push(`/squad/${squadId}/memories/new?type=${fabType}` as any)}
                />

                <EmojiPickerModal {...reactionPicker.pickerProps} />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
});
