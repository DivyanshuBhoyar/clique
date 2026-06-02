import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { AppState } from 'react-native';

const HEARTBEAT_MS = 20_000;

type ActiveContext =
    | { kind: 'channel'; squadId: Id<'squads'>; channelId: Id<'channels'> }
    | { kind: 'dm'; conversationId: Id<'dmConversations'> };

export function useNotificationPresenceHeartbeat(context: ActiveContext | null) {
    const markChannelActive = useMutation(api.push.markChannelActive);
    const markDmConversationActive = useMutation(api.push.markDmConversationActive);

    useEffect(() => {
        if (!context) return;

        let cancelled = false;

        const markActive = () => {
            if (cancelled || AppState.currentState !== 'active') return;

            const promise = context.kind === 'channel'
                ? markChannelActive({ squadId: context.squadId, channelId: context.channelId })
                : markDmConversationActive({ conversationId: context.conversationId });

            promise.catch((error) => {
                console.warn('Notification presence heartbeat failed', error);
            });
        };

        markActive();
        const interval = setInterval(markActive, HEARTBEAT_MS);
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') markActive();
        });

        return () => {
            cancelled = true;
            clearInterval(interval);
            appStateSub.remove();
        };
    }, [context, markChannelActive, markDmConversationActive]);
}

export function useAppNotificationPresenceHeartbeat(enabled: boolean) {
    const markAppActive = useMutation(api.push.markAppActive);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const markActive = () => {
            if (cancelled || AppState.currentState !== 'active') return;
            markAppActive({}).catch((error) => {
                console.warn('App notification presence heartbeat failed', error);
            });
        };

        markActive();
        const interval = setInterval(markActive, HEARTBEAT_MS);
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') markActive();
        });

        return () => {
            cancelled = true;
            clearInterval(interval);
            appStateSub.remove();
        };
    }, [enabled, markAppActive]);
}
