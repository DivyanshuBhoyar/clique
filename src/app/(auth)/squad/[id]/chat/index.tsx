import { useMutation, useQuery } from 'convex/react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function ChatScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<"squads">;

    const channels = useQuery(api.channel.getChannels, { squadId });
    const leaveSquad = useMutation(api.squad.leaveSquad);

    const handleLeaveSquad = async () => {
        try {
            await leaveSquad({ squadId });
        } finally {
            router.replace('/');
        }
    };

    if (channels === undefined) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    const mainChannels = channels.filter(c => c.type === 'main');
    const moodChannels = channels.filter(c => c.type === 'mood');
    const topicChannels = channels.filter(c => c.type === 'topic');

    const renderChannelList = (title: string, data: typeof channels) => {
        if (data.length === 0) return null;
        return (
            <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
                {data.map((channel) => (
                    <Link
                        key={channel._id}
                        href={`/squad/${squadId}/chat/${channel._id}`}
                        style={styles.channelItem}
                    >
                        <ThemedText style={styles.channelName}>{channel.name}</ThemedText>
                    </Link>
                ))}
            </View>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <ThemedText type="title" style={styles.title}>
                        Clubhouse
                    </ThemedText>

                    {renderChannelList("MAIN ROOM", mainChannels)}
                    {renderChannelList("MOOD-BASED ROOMS", moodChannels)}
                    {renderChannelList("TOPIC THREADS", topicChannels)}

                    {/* Leave Squad – lives at the very bottom of scrollable content */}
                    <View style={styles.leaveSection}>
                        <Button
                            title="Leave Squad"
                            color="#FF3B30"
                            onPress={handleLeaveSquad}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.four,
        paddingTop: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 10,
        letterSpacing: 1,
    },
    channelItem: {
        padding: 16,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
        marginBottom: 12,
    },
    channelName: {
        fontSize: 16,
        fontWeight: '600',
    },
    leaveSection: {
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
});
