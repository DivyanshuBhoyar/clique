import { useEffect } from 'react';

import { Id } from '@/convex/_generated/dataModel';

interface UpdatePresenceArgs {
    squadId: Id<'squads'>;
}

export function useChatPresenceHeartbeat(
    squadId: string | undefined,
    updatePresence: (args: UpdatePresenceArgs) => Promise<unknown>,
) {
    useEffect(() => {
        if (!squadId) return;

        const typedSquadId = squadId as Id<'squads'>;
        updatePresence({ squadId: typedSquadId });

        const interval = setInterval(() => {
            updatePresence({ squadId: typedSquadId });
        }, 20000);

        return () => clearInterval(interval);
    }, [squadId, updatePresence]);
}
