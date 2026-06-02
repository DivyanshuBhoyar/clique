import {
    HMSConfig,
    HMSPeer,
    HMSPeerUpdate,
    HMSSDK,
    HMSTrackSettings,
    HMSTrackSettingsInitState,
    HMSUpdateListenerActions,
    HMSVideoTrackSettings,
} from "@100mslive/react-native-hms";
import { useCallback, useEffect, useRef, useState } from "react";

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
        hms.addEventListener(HMSUpdateListenerActions.ON_JOIN, ({ room }) => {
            setIsJoined(true);
            // Populate initial peers from the room
            const localPeer = room.localPeer;
            if (localPeer) {
                setPeers([
                    {
                        peerId: localPeer.peerID,
                        name: localPeer.name,
                        isAudioMuted: localPeer.audioTrack?.isMute() ?? false,
                        isLocal: true,
                    },
                ]);
            }
        });

        hms.addEventListener(
            HMSUpdateListenerActions.ON_PEER_UPDATE,
            ({ peer, type }: { peer: HMSPeer; type: HMSPeerUpdate }) => {
                setPeers((current) => {
                    switch (type) {
                        case HMSPeerUpdate.PEER_JOINED: {
                            // Add new peer if not already present
                            if (current.find((p) => p.peerId === peer.peerID)) return current;
                            return [
                                ...current,
                                {
                                    peerId: peer.peerID,
                                    name: peer.name,
                                    isAudioMuted: peer.audioTrack?.isMute() ?? true,
                                    isLocal: peer.isLocal ?? false,
                                },
                            ];
                        }
                        case HMSPeerUpdate.PEER_LEFT: {
                            return current.filter((p) => p.peerId !== peer.peerID);
                        }
                        case HMSPeerUpdate.AUDIO_TOGGLED: {
                            return current.map((p) =>
                                p.peerId === peer.peerID
                                    ? { ...p, isAudioMuted: peer.audioTrack?.isMute() ?? true }
                                    : p,
                            );
                        }
                        default:
                            return current;
                    }
                });
            },
        );

        hms.addEventListener(HMSUpdateListenerActions.RECONNECTING, () => {
            setIsReconnecting(true);
        });

        hms.addEventListener(HMSUpdateListenerActions.RECONNECTED, () => {
            setIsReconnecting(false);
        });

        hms.addEventListener(HMSUpdateListenerActions.ON_ERROR, (error) => {
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
        const localAudioTrack = hms.localPeer?.audioTrack;
        if (localAudioTrack) {
            const newMuted = !isMuted;
            localAudioTrack.setMute(newMuted);
            setIsMuted(newMuted);
            // Update local peer in peers list
            setPeers((current) =>
                current.map((p) => (p.isLocal ? { ...p, isAudioMuted: newMuted } : p)),
            );
        }
    }, [isMuted]);

    return { join, leave, toggleMute, isJoined, isMuted, isReconnecting, peers };
}
