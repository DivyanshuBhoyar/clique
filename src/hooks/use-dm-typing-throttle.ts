import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useRef } from "react";

const THROTTLE_MS = 2000;

/**
 * Fires setDmTyping at most once every 2s while the user is actively typing.
 * Same pattern as the channel chat typing throttle.
 */
export function useDmTypingThrottle(conversationId: string | undefined) {
    const setTyping = useMutation(api.dmTyping.setDmTyping);
    const lastFiredRef = useRef(0);

    return useCallback(() => {
        if (!conversationId) return;
        const now = Date.now();
        if (now - lastFiredRef.current < THROTTLE_MS) return;
        lastFiredRef.current = now;
        setTyping({ conversationId: conversationId as Id<"dmConversations"> });
    }, [conversationId, setTyping]);
}
