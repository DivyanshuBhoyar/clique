/**
 * Minimal event bus for bridging SQLite writes → React re-reads.
 *
 * Why not use a library? This is a single-event channel with 1-2 listeners.
 * A full EventEmitter (or RxJS) would be overkill.
 *
 * Pattern: "Observer" — the incoming-message hook publishes,
 * the conversation-messages hook subscribes.
 */

type Listener = (conversationId: string) => void;

const listeners = new Set<Listener>();

export function onNewMessage(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function emitNewMessage(conversationId: string) {
    listeners.forEach((fn) => fn(conversationId));
}
