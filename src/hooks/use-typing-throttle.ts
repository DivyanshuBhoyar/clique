import { useCallback, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export function useTypingThrottle(
    squadId: Id<"squads"> | undefined,
    channelId: Id<"channels"> | undefined
) {
    const setTyping = useMutation(api.typing.setTyping);
    const lastTypingAt = useRef(0);

    const handleTyping = useCallback(() => {
        if (!squadId || !channelId) return;
        const now = Date.now();
        if (now - lastTypingAt.current > 2000) {
            lastTypingAt.current = now;
            setTyping({ squadId, channelId });
        }
    }, [setTyping, squadId, channelId]);

    return handleTyping;
}
