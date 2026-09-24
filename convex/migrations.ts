import { internalMutation } from "./_generated/server";

/**
 * Backfills weeklyQuestions with createdBy (defaulting to squad owner)
 * and strips the deprecated channelId field.
 *
 * Run once with:
 *   npx convex run migrations:backfillWeeklyQuestions
 *
 * After all docs are migrated, update schema.ts:
 *   - change createdBy from v.optional(v.id("users")) to v.id("users")
 *   - remove channelId entirely
 */
export const backfillWeeklyQuestions = internalMutation({
    handler: async (ctx) => {
        const questions = await ctx.db.query("weeklyQuestions").collect();
        let patched = 0;

        for (const q of questions) {
            const patch: Record<string, unknown> = {};

            if (q.createdBy === undefined) {
                const squad = await ctx.db.get(q.squadId);
                if (squad) {
                    patch.createdBy = squad.createdBy;
                }
            }

            // Strip deprecated channelId from existing docs
            if ((q as any).channelId !== undefined) {
                patch.channelId = undefined;
            }

            if (Object.keys(patch).length > 0) {
                await ctx.db.patch(q._id, patch);
                patched++;
            }
        }

        return { patched, total: questions.length };
    },
});
