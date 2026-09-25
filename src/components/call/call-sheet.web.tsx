/**
 * Web version of CallSheet — wraps with HMSRoomProvider required by @100mslive/react-sdk.
 * The UI logic is identical to native; only the provider wrapper differs.
 */

import { HMSRoomProvider } from '@100mslive/react-sdk';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { CallPeer, useHmsCall } from '@/hooks/use-hms-call';
import { useTheme } from '@/hooks/use-theme';

const SHEET_HEIGHT = 156;
const CALL_HEARTBEAT_INTERVAL_MS = 10_000;

interface CallSheetProps {
    callRoom: {
        _id: Id<"callRooms">;
        moderatorRoomCode: string;
        participantRoomCode: string;
        startedBy: Id<"users">;
        isActive: boolean;
        activeParticipantCount?: number;
        isStarting?: boolean;
    } | null | undefined;
    currentUserId?: Id<"users">;
    displayName: string;
    onJoin?: (callRoomId: Id<"callRooms">) => Promise<unknown> | unknown;
    onLeave?: (callRoomId: Id<"callRooms">) => Promise<unknown> | unknown;
    onHeartbeat?: (callRoomId: Id<"callRooms">) => Promise<unknown> | unknown;
}

/**
 * Web CallSheet — wraps inner component with HMSRoomProvider.
 * The provider scopes a single HMS session; mounting/unmounting it resets the session.
 */
export function CallSheet(props: CallSheetProps) {
    return (
        <HMSRoomProvider>
            <CallSheetInner {...props} />
        </HMSRoomProvider>
    );
}

function CallSheetInner({ callRoom, currentUserId, displayName, onJoin, onLeave, onHeartbeat }: CallSheetProps) {
    const theme = useTheme();
    const { join, leave, toggleMute, isJoined, isMuted, isReconnecting, peers } = useHmsCall();
    const [isJoining, setIsJoining] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const autoJoinAttemptedRoomRef = useRef<Id<"callRooms"> | null>(null);
    const joinedCallRoomIdRef = useRef<Id<"callRooms"> | null>(null);
    const isJoinedRef = useRef(false);
    const onLeaveRef = useRef(onLeave);
    const onHeartbeatRef = useRef(onHeartbeat);

    const activeParticipantCount = callRoom?.activeParticipantCount ?? 0;
    const shouldShowSheet = Boolean(
        isJoined ||
        (callRoom?.isActive && (callRoom.isStarting || activeParticipantCount > 0)),
    );
    const displayedParticipantCount = Math.max(
        peers.length,
        activeParticipantCount,
        isJoined ? 1 : 0,
    );
    const statusText = isReconnecting
        ? "Reconnecting..."
        : displayedParticipantCount > 0
            ? `${displayedParticipantCount} in call`
            : "Starting call...";

    const height = useSharedValue(0);
    useEffect(() => {
        height.value = withSpring(shouldShowSheet ? SHEET_HEIGHT : 0, {
            damping: 20,
            stiffness: 200,
        });
    }, [height, shouldShowSheet]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        overflow: "hidden" as const,
    }));

    useEffect(() => {
        onLeaveRef.current = onLeave;
    }, [onLeave]);

    useEffect(() => {
        onHeartbeatRef.current = onHeartbeat;
    }, [onHeartbeat]);

    useEffect(() => {
        isJoinedRef.current = isJoined;
        if (isJoined && callRoom?._id) {
            joinedCallRoomIdRef.current = callRoom._id;
        }
    }, [callRoom?._id, isJoined]);

    useEffect(() => {
        return () => {
            const joinedCallRoomId = joinedCallRoomIdRef.current;
            if (isJoinedRef.current && joinedCallRoomId) {
                void Promise.resolve(onLeaveRef.current?.(joinedCallRoomId)).catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        if (!isJoined || !callRoom?._id || !onHeartbeatRef.current) return;

        let cancelled = false;
        const callRoomId = callRoom._id;

        const sendHeartbeat = async () => {
            try {
                const result = await onHeartbeatRef.current?.(callRoomId);
                if (
                    !cancelled &&
                    result &&
                    typeof result === 'object' &&
                    'active' in result &&
                    result.active === false
                ) {
                    await leave();
                    isJoinedRef.current = false;
                }
            } catch {
                // Heartbeat failures should not interrupt audio; the backend TTL will clean stale rows.
            }
        };

        void sendHeartbeat();
        const interval = setInterval(() => void sendHeartbeat(), CALL_HEARTBEAT_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [callRoom?._id, isJoined, leave]);

    const handleJoin = useCallback(async () => {
        if (!callRoom) return;
        const roomCode = currentUserId === callRoom.startedBy
            ? callRoom.moderatorRoomCode
            : callRoom.participantRoomCode;
        setIsJoining(true);
        setErrorMessage(null);
        let didJoinRoom = false;
        try {
            await join(roomCode, displayName);
            didJoinRoom = true;
            await onJoin?.(callRoom._id);
        } catch (error) {
            if (didJoinRoom) {
                await leave().catch(() => {});
            }
            if ((callRoom.activeParticipantCount ?? 0) === 0) {
                await onLeave?.(callRoom._id);
            }
            const message = error instanceof Error
                ? error.message
                : 'Could not join the call. Please try again.';
            setErrorMessage(message);
        } finally {
            setIsJoining(false);
        }
    }, [callRoom, currentUserId, displayName, join, leave, onJoin, onLeave]);

    const handleLeave = useCallback(async () => {
        await leave();
        setErrorMessage(null);
        isJoinedRef.current = false;
        if (callRoom) {
            await onLeave?.(callRoom._id);
        }
    }, [callRoom, leave, onLeave]);

    useEffect(() => {
        const shouldAutoJoin =
            callRoom?.isActive === true &&
            callRoom.startedBy === currentUserId &&
            activeParticipantCount === 0 &&
            !isJoined &&
            !isJoining &&
            autoJoinAttemptedRoomRef.current !== callRoom._id;

        if (!shouldAutoJoin) return;
        autoJoinAttemptedRoomRef.current = callRoom._id;
        void handleJoin();
    }, [activeParticipantCount, callRoom, currentUserId, handleJoin, isJoined, isJoining]);

    if (!shouldShowSheet) {
        return <Animated.View style={animatedStyle} />;
    }

    return (
        <Animated.View style={[styles.container, { backgroundColor: theme.surfaceWarm }, animatedStyle]}>
            <View style={styles.headerRow}>
                <View style={styles.callIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
                    <ThemedText style={styles.liveText}>
                        {statusText}
                    </ThemedText>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.peersRow}
            >
                {peers.map((peer) => (
                    <ParticipantPill key={peer.peerId} peer={peer} theme={theme} />
                ))}
            </ScrollView>

            <View style={styles.controlsRow}>
                {isJoined ? (
                    <>
                        <Pressable
                            style={[
                                styles.controlButton,
                                { backgroundColor: isMuted ? theme.errorSoft : theme.backgroundElement },
                            ]}
                            onPress={toggleMute}
                            accessibilityRole="button"
                            accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
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
                            accessibilityRole="button"
                            accessibilityLabel="Leave call"
                        >
                            <PhoneOff size={16} color="#fff" />
                            <ThemedText style={styles.leaveText}>Leave</ThemedText>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={[styles.controlButton, styles.joinButton, { backgroundColor: theme.success }]}
                        onPress={handleJoin}
                        disabled={isJoining}
                        accessibilityRole="button"
                        accessibilityLabel={isJoining ? "Joining call" : "Join call"}
                    >
                        <Phone size={16} color="#fff" />
                        <ThemedText style={styles.joinText}>{isJoining ? 'Joining…' : 'Join Call'}</ThemedText>
                    </Pressable>
                )}
            </View>

            {errorMessage ? (
                <ThemedText type="caption" style={[styles.errorText, { color: theme.error }]}>
                    {errorMessage}
                </ThemedText>
            ) : null}
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
    errorText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
