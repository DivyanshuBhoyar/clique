import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

type VoteValue = "up" | "down";

/**
 * Computes the optimistic vote deltas based on the current vote state
 * and the new value being toggled.
 *
 * | currentVote | newValue | upDelta | downDelta | newUserVote |
 * |-------------|----------|---------|-----------|-------------|
 * | null        | up       | +1      | 0         | "up"        |
 * | null        | down     | 0       | +1        | "down"      |
 * | up          | up       | -1      | 0         | null        |
 * | down        | down     | 0       | -1        | null        |
 * | up          | down     | -1      | +1        | "down"      |
 * | down        | up       | +1      | -1        | "up"        |
 */
function computeVoteDelta(
    currentVote: VoteValue | null,
    newValue: VoteValue,
): { upDelta: number; downDelta: number; newUserVote: VoteValue | null } {
    if (!currentVote) {
        return {
            upDelta: newValue === "up" ? 1 : 0,
            downDelta: newValue === "down" ? 1 : 0,
            newUserVote: newValue,
        };
    }
    if (currentVote === newValue) {
        return {
            upDelta: newValue === "up" ? -1 : 0,
            downDelta: newValue === "down" ? -1 : 0,
            newUserVote: null,
        };
    }
    return {
        upDelta: newValue === "up" ? 1 : -1,
        downDelta: newValue === "down" ? 1 : -1,
        newUserVote: newValue,
    };
}

/**
 * Hook for voting on a drop with optimistic update.
 *
 * How it works:
 * 1. User taps vote → mutation fires
 * 2. `.withOptimisticUpdate` runs BEFORE the server responds:
 *    - Reads the current cached query result (localStore.getQuery)
 *    - Computes what the vote counts SHOULD be
 *    - Writes the updated result back (localStore.setQuery)
 * 3. UI instantly reflects the new state
 * 4. When the server responds, Convex replaces the optimistic value
 *    with the real one (which should match)
 */
export function useDropVote() {
    return useMutation(api.drops.toggleDropVote).withOptimisticUpdate(
        (localStore, args) => {
            // Optimistically update getDrop (single drop query — stable args)
            const drop = localStore.getQuery(api.drops.getDrop, { dropId: args.dropId });
            if (drop && drop !== null) {
                const { upDelta, downDelta, newUserVote } = computeVoteDelta(
                    drop.userVote,
                    args.value,
                );

                localStore.setQuery(api.drops.getDrop, { dropId: args.dropId }, {
                    ...drop,
                    upvotes: drop.upvotes + upDelta,
                    downvotes: drop.downvotes + downDelta,
                    userVote: newUserVote,
                });
            }
        },
    );
}

/**
 * Hook for voting on a comment.
 *
 * Comment votes use the paginated getDropComments query, whose args
 * include a cursor that changes as pages load — making it hard to target
 * with localStore.getQuery. So we skip the optimistic update for now;
 * the server response syncs within ~100ms.
 */
export function useCommentVote() {
    return useMutation(api.drops.toggleCommentVote);
}
