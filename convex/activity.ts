import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { enrichUser, requireMembership } from "./users";

const DEFAULT_LIMIT = 5;
const SOURCE_LIMIT = 6;

function snippet(text: string, fallback: string) {
    const clean = text.trim().replace(/\s+/g, " ");
    if (!clean) return fallback;
    return clean.length > 72 ? `${clean.slice(0, 69)}…` : clean;
}

export const getRecentActivity = query({
    args: {
        squadId: v.id("squads"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireMembership(ctx, args.squadId);
        const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), 10);

        const [drops, memories, messages, notes] = await Promise.all([
            ctx.db
                .query("drops")
                .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
                .order("desc")
                .take(SOURCE_LIMIT),
            ctx.db
                .query("memories")
                .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
                .order("desc")
                .take(SOURCE_LIMIT),
            ctx.db
                .query("messages")
                .withIndex("by_squad", (q) => q.eq("squadId", args.squadId))
                .order("desc")
                .take(SOURCE_LIMIT),
            ctx.db
                .query("notes")
                .withIndex("by_squad_and_updatedAt", (q) => q.eq("squadId", args.squadId))
                .order("desc")
                .take(SOURCE_LIMIT),
        ]);

        const items: Array<{
            id: string;
            type: "drop" | "memory" | "chat" | "note";
            label: string;
            sub: string;
            createdAt: number;
            route: "drops" | "memories" | "chat" | "notes";
            routeId?: string;
        }> = [];

        for (const drop of drops) {
            const { nickname } = await enrichUser(ctx, drop.userId, drop.squadId);
            items.push({
                id: drop._id,
                type: "drop",
                label: `${nickname} added a ${drop.category} drop`,
                sub: snippet(drop.content, "New drop"),
                createdAt: drop.createdAt,
                route: "drops",
                routeId: drop._id,
            });
        }

        for (const memory of memories) {
            const { nickname } = await enrichUser(ctx, memory.createdBy, memory.squadId);
            items.push({
                id: memory._id,
                type: "memory",
                label: memory.type === "event" ? `${nickname} created a memory` : `${nickname} wrote on the memory wall`,
                sub: snippet(memory.title ?? memory.content ?? "", memory.type === "event" ? "New event memory" : "New wall memory"),
                createdAt: memory.createdAt,
                route: "memories",
                routeId: memory._id,
            });
        }

        for (const message of messages) {
            if (message.deleted) continue;
            items.push({
                id: message._id,
                type: "chat",
                label: `${message.nickname ?? "Someone"} sent a message`,
                sub: snippet(message.type === "image" ? message.content || "📷 Photo" : message.content, "New message"),
                createdAt: message.createdAt,
                route: "chat",
                routeId: message.channelId,
            });
        }

        for (const note of notes) {
            const { nickname } = await enrichUser(ctx, note.ownerId as Id<"users">, note.squadId);
            items.push({
                id: note._id,
                type: "note",
                label: `${nickname} updated a ${note.type} note`,
                sub: snippet(note.title, "Untitled note"),
                createdAt: note.updatedAt,
                route: "notes",
                routeId: note._id,
            });
        }

        return items
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    },
});
