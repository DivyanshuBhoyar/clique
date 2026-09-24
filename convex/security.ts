import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const SECURITY_LIMITS = {
    squads: {
        maxPerUser: 50,
        maxMembers: 50,
        maxChannels: 100,
        maxPrivateChannelMembers: 50,
    },
    content: {
        maxNotesPerUserPerSquad: 500,
        maxDropsPerUserPerSquad: 500,
        maxMemoriesPerSquad: 500,
        maxMemoryItemsPerMemory: 100,
        maxCommentsPerDrop: 200,
        maxCommentsPerMemory: 200,
        maxCommentsPerMemoryItem: 100,
        maxPollsPerSquad: 100,
        maxPollOptions: 8,
        maxWeeklyQuestionsPerSquad: 1000,
        maxQuotesPerSquad: 300,
        maxConfessionsPerSquad: 300,
    },
    dm: {
        maxConversationsPerUser: 200,
        maxEnvelopesPerFanOut: 12,
        maxPendingPerDevice: 50,
        maxReactionsPerConversationRead: 500,
        maxUserDevices: 5,
    },
    query: {
        maxPageSize: 50,
        maxChannelList: 50,
        maxSquadMembersRead: 50,
        maxPresenceRead: 50,
        maxTypingRead: 20,
        maxReactionRead: 200,
        maxVoteRead: 200,
        maxQuestionRead: 50,
        maxAnswerRead: 100,
        maxDmableSquads: 5,
        maxDmableUsers: 100,
    },
    rate: {
        createSquad: { max: 3, windowMs: 60 * 60 * 1000 },
        joinSquad: { max: 10, windowMs: 10 * 60 * 1000 },
        createChannel: { max: 10, windowMs: 60 * 60 * 1000 },
        channelMembershipUpdate: { max: 20, windowMs: 60 * 60 * 1000 },
        sendMessage: { max: 30, windowMs: 60 * 1000 },
        sendImageMessage: { max: 10, windowMs: 60 * 1000 },
        sendGifMessage: { max: 15, windowMs: 60 * 1000 },
        sendDm: { max: 30, windowMs: 60 * 1000 },
        dmConversation: { max: 20, windowMs: 60 * 60 * 1000 },
        registerDevice: { max: 10, windowMs: 60 * 60 * 1000 },
        reaction: { max: 120, windowMs: 60 * 1000 },
        comment: { max: 20, windowMs: 60 * 1000 },
        contentCreate: { max: 30, windowMs: 60 * 60 * 1000 },
        noteUpdate: { max: 180, windowMs: 60 * 1000 },
        pollVote: { max: 120, windowMs: 60 * 1000 },
        typing: { max: 60, windowMs: 60 * 1000 },
        presence: { max: 60, windowMs: 60 * 1000 },
        uploadUrl: { max: 30, windowMs: 60 * 60 * 1000 },
    },
} as const;

type RateLimit = { max: number; windowMs: number };

type SecurityCtx = QueryCtx | MutationCtx;

function rateKey(parts: readonly string[]) {
    return parts.map((part) => part.replaceAll(":", "_")).join(":");
}

export function assertPaginationLimit(name: string, paginationOpts: { numItems: number }, max = SECURITY_LIMITS.query.maxPageSize) {
    if (paginationOpts.numItems < 1 || paginationOpts.numItems > max) {
        throw new Error(`${name} page size must be between 1 and ${max}`);
    }
}

export function assertArrayLimit(name: string, values: readonly unknown[], max: number) {
    if (values.length > max) {
        throw new Error(`${name} must include ${max} items or fewer`);
    }
}

export async function assertRateLimit(
    ctx: MutationCtx,
    keyParts: readonly string[],
    limit: RateLimit,
) {
    const key = rateKey(keyParts);
    const now = Date.now();
    const existing = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();

    if (!existing || now - existing.windowStartedAt >= limit.windowMs) {
        if (existing) {
            await ctx.db.patch(existing._id, {
                windowStartedAt: now,
                count: 1,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("rateLimits", {
                key,
                windowStartedAt: now,
                count: 1,
                updatedAt: now,
            });
        }
        return;
    }

    if (existing.count >= limit.max) {
        throw new Error("RATE_LIMITED");
    }

    await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        updatedAt: now,
    });
}

export async function assertUsersShareSquad(
    ctx: SecurityCtx,
    userId: Id<"users">,
    otherUserId: Id<"users">,
) {
    if (userId === otherUserId) return;

    const myMemberships = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(SECURITY_LIMITS.query.maxDmableSquads + 1);
    const sharedSquadIds = new Set(myMemberships.map((membership) => membership.squadId));

    const theirMemberships = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", otherUserId))
        .take(SECURITY_LIMITS.query.maxDmableSquads + 1);

    if (!theirMemberships.some((membership) => sharedSquadIds.has(membership.squadId))) {
        throw new Error("FORBIDDEN");
    }
}