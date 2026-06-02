import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { CallPeer, useHmsCall } from '@/hooks/use-hms-call';
import { useTheme } from '@/hooks/use-theme';

const SHEET_HEIGHT = 156;

interface CallSheetProps {
    /** The active call room document (null when no call) */
    callRoom: {
        _id: Id<"callRooms">;
        moderatorRoomCode: string;
        participantRoomCode: string;
        startedBy: Id<"users">;
        isActive: boolean;
    } | null | undefined;
    /** Current user's ID — used to determine moderator vs participant */
    currentUserId?: Id<"users">;
    /** Current user's display name for the call */
    displayName: string;
    /** Called when user joins/leaves so parent can update Convex participant records */
    onJoin?: (callRoomId: Id<"callRooms">) => void;
    onLeave?: (callRoomId: Id<"callRooms">) => void;
}

/**
 * Animated audio call sheet that sits between the header and message list.
 * Slides open when there's an active call, stays collapsed (0 height) otherwise.
 * Chat beneath remains fully interactive.
 */
export function CallSheet({ callRoom, currentUserId, displayName, onJoin, onLeave }: CallSheetProps) {
    const theme = useTheme();
    const { join, leave, toggleMute, isJoined, isMuted, isReconnecting, peers } = useHmsCall();

    // Animate height open/closed
    const height = useSharedValue(0);
    useEffect(() => {
        height.value = withSpring(callRoom?.isActive ? SHEET_HEIGHT : 0, {
            damping: 20,
            stiffness: 200,
        });
    }, [callRoom?.isActive, height]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        overflow: "hidden" as const,
    }));

    const handleJoin = useCallback(async () => {
        if (!callRoom) return;
        // Initiator gets moderator role (can mute others, end room)
        const roomCode = currentUserId === callRoom.startedBy
            ? callRoom.moderatorRoomCode
            : callRoom.participantRoomCode;
        await join(roomCode, displayName);
        onJoin?.(callRoom._id);
    }, [callRoom, currentUserId, displayName, join, onJoin]);

    const handleLeave = useCallback(async () => {
        if (!callRoom) return;
        await leave();
        onLeave?.(callRoom._id);
    }, [callRoom, leave, onLeave]);

    // If no active call, render an empty animated view (collapses to 0)
    if (!callRoom?.isActive && !isJoined) {
        return <Animated.View style={animatedStyle} />;
    }

    return (
        <Animated.View style={[styles.container, { backgroundColor: theme.surfaceWarm }, animatedStyle]}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={styles.callIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
                    <ThemedText style={styles.liveText}>
                        {isReconnecting ? "Reconnecting..." : `${peers.length} in call`}
                    </ThemedText>
                </View>
            </View>

            {/* Participant pills — horizontal scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.peersRow}
            >
                {peers.map((peer) => (
                    <ParticipantPill key={peer.peerId} peer={peer} theme={theme} />
                ))}
            </ScrollView>

            {/* Controls row */}
            <View style={styles.controlsRow}>
                {isJoined ? (
                    <>
                        <Pressable
                            style={[
                                styles.controlButton,
                                { backgroundColor: isMuted ? theme.errorSoft : theme.backgroundElement },
                            ]}
                            onPress={toggleMute}
                        >
                            {isMuted ? (
                                <MicOff size={18} color={theme.error} />
                            ) : (
                                <Mic size={18} color={theme.text} />
                            )}
                        </Pressable>

                        <Pressable
                            style={[styles.controlButton, styles.leaveButton, { backgroundColor: theme.error }]}
                            onPress={handleLeave}
                        >
                            <PhoneOff size={16} color="#fff" />
                            <ThemedText style={styles.leaveText}>Leave</ThemedText>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={[styles.controlButton, styles.joinButton, { backgroundColor: theme.success }]}
                        onPress={handleJoin}
                    >
                        <Phone size={16} color="#fff" />
                        <ThemedText style={styles.joinText}>Join Call</ThemedText>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

function ParticipantPill({ peer, theme }: { peer: CallPeer; theme: any }) {
    return (
        <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
            <UserAvatar uri={null} fallbackText={peer.name} size={28} />
            <ThemedText style={styles.pillName} numberOfLines={1}>
                {peer.isLocal ? "You" : peer.name}
            </ThemedText>
            {peer.isAudioMuted && <MicOff size={12} color={theme.textTertiary} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(0,0,0,0.06)",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    callIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    liveText: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.7,
    },
    peersRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: Radius.full,
    },
    pillName: {
        fontSize: 12,
        fontWeight: "500",
        maxWidth: 64,
    },
    controlsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    controlButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Radius.full,
    },
    leaveButton: {},
    leaveText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    joinButton: {},
    joinText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
});
