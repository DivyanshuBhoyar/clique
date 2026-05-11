import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";


export const cleanupExpiredChannels = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        const channels = await ctx.db
            .query("channels")
            .withIndex("by_type", (q) => q.eq("type", "ephemeral"))
            .collect();

        const expired = channels.filter((c) => {
            if (!c.expiresAt) return false;
            const graceMs = c.gracePeriodMs ?? 0;
            return now > c.expiresAt + graceMs;
        });

        for (const channel of expired) {
            let messages = await ctx.db
                .query("messages")
                .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
                .take(100);

            for (const msg of messages) {
                const reactions = await ctx.db
                    .query("reactions")
                    .withIndex("by_message", (q) => q.eq("messageId", msg._id))
                    .collect();
                for (const r of reactions) {
                    await ctx.db.delete(r._id);
                }

                await ctx.db.delete(msg._id);
            }

            const typing = await ctx.db
                .query("typing")
                .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
                .collect();
            for (const t of typing) {
                await ctx.db.delete(t._id);
            }

            const readStatuses = await ctx.db
                .query("channelReadStatus")
                .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
                .collect();
            for (const rs of readStatuses) {
                await ctx.db.delete(rs._id);
            }

            // Finally, delete the channel
            await ctx.db.delete(channel._id);
        }
    },
});

export const cleanupEmptyJournals = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        const journals = await ctx.db
            .query("notes")
            .withIndex("by_type_createdAt", (q) =>
                q.eq("type", "journal").lt("createdAt", cutoff)
            )
            .collect();

        const empty = journals.filter((j) => j.content === "");

        for (const journal of empty) {
            await ctx.db.delete(journal._id);
        }
    },
});

const crons = cronJobs();
crons.interval("cleanup expired ephemeral channels", { minutes: 10 }, internal.crons.cleanupExpiredChannels, {});
crons.interval("cleanup empty journals", { hours: 24 }, internal.crons.cleanupEmptyJournals, {});
export default crons;
