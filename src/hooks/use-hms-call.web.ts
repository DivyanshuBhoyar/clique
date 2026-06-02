/**
 * Web implementation of useHmsCall using @100mslive/react-sdk.
 *
 * The web SDK is hook-based and reactive (unlike the native imperative SDK).
 * This file adapts the web SDK hooks to match the same interface as the native hook.
 *
 * IMPORTANT: Components using this hook must be wrapped in <HMSRoomProvider>.
 * We export a wrapper component (HmsCallProvider) for this purpose.
 */

import {
    selectIsConnectedToRoom,
    selectIsLocalAudioEnabled,
    selectPeers,
    useHMSActions,
    useHMSStore,
} from "@100mslive/react-sdk";
import { useCallback, useState } from "react";

export interface CallPeer {
    peerId: string;
    name: string;
    isAudioMuted: boolean;
    isLocal: boolean;
}

export function useHmsCall() {
    const hmsActions = useHMSActions();
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
    const peers = useHMSStore(selectPeers);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const join = useCallback(
        async (roomCode: string, userName: string) => {
            try {
                const authToken = await hmsActions.getAuthTokenByRoomCode({ roomCode });
                await hmsActions.join({
                    userName,
                    authToken,
                    settings: { isAudioMuted: false, isVideoMuted: true },
                });
            } catch (err) {
                console.error("[HMS Web] Join failed:", err);
            }
        },
        [hmsActions],
    );

    const leave = useCallback(async () => {
        await hmsActions.leave();
    }, [hmsActions]);

    const toggleMute = useCallback(() => {
        hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    }, [hmsActions, isLocalAudioEnabled]);

    // Map HMS peers to our CallPeer interface
    const callPeers: CallPeer[] = (peers ?? []).map((peer) => ({
        peerId: peer.id,
        name: peer.name,
        isAudioMuted: !peer.audioEnabled,
        isLocal: peer.isLocal,
    }));

    return {
        join,
        leave,
        toggleMute,
        isJoined: isConnected ?? false,
        isMuted: !isLocalAudioEnabled,
        isReconnecting,
        peers: callPeers,
    };
}
