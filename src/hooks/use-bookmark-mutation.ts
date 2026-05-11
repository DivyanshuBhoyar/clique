import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Hook for toggling bookmarks.
 *
 * No optimistic update — all list queries (getDrops, getNotesFeed,
 * getWallMemories, getEventMemories) are paginated with changing cursors,
 * so targeting them with localStore.getQuery is unreliable.
 * The server syncs the isBookmarked state within ~100ms.
 */
export function useBookmarkToggle() {
    return useMutation(api.bookmarks.toggleBookmark);
}
