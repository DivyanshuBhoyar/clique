import type {
    HMSPeer,
    HMSPeerUpdate as HMSPeerUpdateType,
    HMSSDK,
    HMSTrack,
    HMSTrackUpdate as HMSTrackUpdateType,
} from "@100mslive/react-native-hms";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

export interface CallPeer {
    peerId: string;
    name: string;
    isAudioMuted: boolean;
    isLocal: boolean;
}

interface UseHmsCallReturn {
    /** Join an audio room by room code */
    join: (roomCode: string, userName: string) => Promise<void>;
    /** Leave the room and destroy the SDK instance */
    leave: () => Promise<void>;
    /** Toggle local audio mute */
    toggleMute: () => void;
    /** Whether currently connected to a room */
    isJoined: boolean;
    /** Whether local audio is muted */
    isMuted: boolean;
    /** Whether currently reconnecting */
    isReconnecting: boolean;
    /** List of peers in the room */
    peers: CallPeer[];
}

/**
 * Encapsulates the 100ms SDK for audio-only calls.
 *
 * This hook is the bridge between the imperative HMS event system and React state.
 * It builds an HMSSDK instance with video disabled, registers event listeners,
 * and exposes reactive state (peers, mute, connection) for the UI.
 */
export function useHmsCall(): UseHmsCallReturn {
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [peers, setPeers] = useState<CallPeer[]>([]);
    const hmsRef = useRef<HMSSDK | null>(null);

    // Cleanup on unmount — leave the room if still connected
    useEffect(() => {
        return () => {
            if (hmsRef.current) {
                hmsRef.current.leave().catch(() => {});
                hmsRef.current.destroy().catch(() => {});
                hmsRef.current = null;
            }
        };
    }, []);

    const join = useCallback(async (roomCode: string, userName: string) => {
        await ensureMicrophonePermission();
        const {
            HMSConfig,
            HMSSDK,
            HMSPeerUpdate,
            HMSTrackType,
            HMSTrackSettings,
            HMSTrackSettingsInitState,
            HMSTrackUpdate,
            HMSUpdateListenerActions,
            HMSVideoTrackSettings,
        } = await loadHmsModule();

        // Build SDK with video track disabled (audio-only mode)
        const videoSettings = new HMSVideoTrackSettings({
            initialState: HMSTrackSettingsInitState.MUTED,
        });
        const trackSettings = new HMSTrackSettings({
            video: videoSettings,
        });
        const hms = await HMSSDK.build({ trackSettings });
        hmsRef.current = hms;

        // Register listeners before joining
        hms.addEventListener(HMSUpdateListenerActions.ON_JOIN, ({ room }: { room: { localPeer?: HMSPeer | null } }) => {
            setIsJoined(true);
            // Populate initial peers from the room
            const localPeer = room.localPeer;
            if (localPeer) {
                setPeers([
                    {
                        peerId: localPeer.peerID,
                        name: localPeer.name ?? "You",
                        isAudioMuted: localPeer.audioTrack?.isMute() ?? false,
                        isLocal: true,
                    },
                ]);
            }
        });

        hms.addEventListener(
            HMSUpdateListenerActions.ON_PEER_UPDATE,
            ({ peer, type }: { peer: HMSPeer; type: HMSPeerUpdateType }) => {
                setPeers((current) => {
                    switch (type) {
                        case HMSPeerUpdate.PEER_JOINED: {
                            // Add new peer if not already present
                            if (current.find((p) => p.peerId === peer.peerID)) return current;
                            return [
                                ...current,
                                {
                                    peerId: peer.peerID,
                                    name: peer.name ?? "Guest",
                                    isAudioMuted: peer.audioTrack?.isMute() ?? true,
                                    isLocal: peer.isLocal ?? false,
                                },
                            ];
                        }
                        case HMSPeerUpdate.PEER_LEFT: {
                            return current.filter((p) => p.peerId !== peer.peerID);
                        }
                        default:
                            return current;
                    }
                });
            },
        );

        hms.addEventListener(
            HMSUpdateListenerActions.ON_TRACK_UPDATE,
            ({ peer, track, type }: { peer: HMSPeer; track?: HMSTrack; type: HMSTrackUpdateType }) => {
                if (track?.type !== HMSTrackType.AUDIO) return;
                if (type !== HMSTrackUpdate.TRACK_MUTED && type !== HMSTrackUpdate.TRACK_UNMUTED) return;

                const isAudioMuted = type === HMSTrackUpdate.TRACK_MUTED;
                setPeers((current) =>
                    current.map((p) =>
                        p.peerId === peer.peerID ? { ...p, isAudioMuted } : p,
                    ),
                );
            },
        );

        hms.addEventListener(HMSUpdateListenerActions.RECONNECTING, () => {
            setIsReconnecting(true);
        });

        hms.addEventListener(HMSUpdateListenerActions.RECONNECTED, () => {
            setIsReconnecting(false);
        });

        hms.addEventListener(HMSUpdateListenerActions.ON_ERROR, (error: { code?: unknown; message?: unknown }) => {
            console.error("[HMS] Error:", error.code, error.message);
        });

        // Get auth token from room code (SDK helper — no server call needed)
        const token = await hms.getAuthTokenByRoomCode(roomCode);

        // Join the room
        const config = new HMSConfig({ authToken: token, username: userName });
        await hms.join(config);
    }, []);

    const leave = useCallback(async () => {
        if (hmsRef.current) {
            await hmsRef.current.leave();
            await hmsRef.current.destroy();
            hmsRef.current = null;
        }
        setIsJoined(false);
        setIsMuted(false);
        setIsReconnecting(false);
        setPeers([]);
    }, []);

    const toggleMute = useCallback(() => {
        const hms = hmsRef.current;
        if (!hms) return;

        void (async () => {
            const localPeer = await hms.getLocalPeer();
            const localAudioTrack = localPeer.localAudioTrack();
            if (!localAudioTrack) return;

            const newMuted = !isMuted;
            localAudioTrack.setMute(newMuted);
            setIsMuted(newMuted);
            // Update local peer in peers list
            setPeers((current) =>
                current.map((p) => (p.isLocal ? { ...p, isAudioMuted: newMuted } : p)),
            );
        })().catch((error: unknown) => {
            console.error("[HMS] Could not toggle microphone", error);
        });
    }, [isMuted]);

    return { join, leave, toggleMute, isJoined, isMuted, isReconnecting, peers };
}

async function loadHmsModule() {
    try {
        return await import("@100mslive/react-native-hms");
    } catch {
        throw new Error("Voice calls require a development or production build. Expo Go cannot load the 100ms native SDK.");
    }
}

async function ensureMicrophonePermission() {
    if (Platform.OS === "android") {
        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error("Microphone permission is required to join calls.");
        }
        return;
    }

    const { Camera } = await import("expo-camera");
    const permission = await Camera.requestMicrophonePermissionsAsync();
    if (!permission.granted) {
        throw new Error("Microphone permission is required to join calls.");
    }
}
