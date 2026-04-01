import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    squads: defineTable({
        name: v.string(),
        passwordHash: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_created", ["createdAt"]),


    memberships: defineTable({
        userId: v.id("users"),
        squadId: v.id("squads"),
        nickname: v.string(),
        vibe: v.optional(v.string()),
        statusText: v.optional(v.string()),
        streakCount: v.optional(v.number()),
        lastActiveAt: v.optional(v.number()),
        joinedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_squad", ["squadId"])
        .index("by_user_squad", ["userId", "squadId"]),


    channels: defineTable({
        squadId: v.id("squads"),
        name: v.string(),
        type: v.union(
            v.literal("main"),
            v.literal("topic"),
            v.literal("mood"),
            v.literal("thread"),
            v.literal("ephemeral")
        ),
        parentChannelId: v.optional(v.id("channels")),
        expiresAt: v.optional(v.number()),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_parent", ["parentChannelId"]),



    messages: defineTable({
        channelId: v.id("channels"),
        squadId: v.id("squads"),
        userId: v.id("users"),

        content: v.string(),

        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("system")
        ),

        parentMessageId: v.optional(v.id("messages")),

        nickname: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),

        createdAt: v.number(),
        editedAt: v.optional(v.number()),

        deleted: v.optional(v.boolean()),
    })
        .index("by_channel", ["channelId", "createdAt"])
        .index("by_squad", ["squadId"])
        .index("by_parent", ["parentMessageId"]), // ✅ NEW


    typing: defineTable({
        squadId: v.id("squads"),
        channelId: v.id("channels"),
        userId: v.id("users"),

        lastTypingAt: v.number(),
    })
        .index("by_channel", ["channelId"])
        .index("by_user_channel", ["userId", "channelId"]),

    reactions: defineTable({
        messageId: v.id("messages"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_message", ["messageId"])
        .index("by_user_message", ["userId", "messageId"]),


    notes: defineTable({
        squadId: v.id("squads"),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("personal"),
            v.literal("shared"),
            v.literal("friend")
        ),
        ownerId: v.id("users"),
        targetUserId: v.optional(v.id("users")),
        channelId: v.optional(v.id("channels")),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_owner", ["ownerId"])
        .index("by_squad", ["squadId"])
        .index("by_channel", ["channelId"])
        .index("by_target_user", ["targetUserId"]),


    quotes: defineTable({
        squadId: v.id("squads"),
        content: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
        messageId: v.optional(v.id("messages")),
    })
        .index("by_squad", ["squadId"])
        .index("by_created", ["createdAt"]),


    memories: defineTable({
        squadId: v.id("squads"),
        title: v.string(),
        description: v.optional(v.string()),
        type: v.union(
            v.literal("event"),
            v.literal("trip"),
            v.literal("inside_joke")
        ),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_type", ["type"]),


    memoryItems: defineTable({
        memoryId: v.id("memories"),
        userId: v.id("users"),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("link")
        ),
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_memory", ["memoryId"]),


    confessions: defineTable({
        squadId: v.id("squads"),
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_created", ["createdAt"]),

    polls: defineTable({
        squadId: v.id("squads"),
        question: v.string(),
        createdBy: v.id("users"),
        expiresAt: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_created", ["createdAt"]),


    pollOptions: defineTable({
        pollId: v.id("polls"),
        text: v.string(),
    })
        .index("by_poll", ["pollId"]),


    pollVotes: defineTable({
        pollId: v.id("polls"),
        optionId: v.id("pollOptions"),
        userId: v.id("users"),
    })
        .index("by_poll", ["pollId"])
        .index("by_user_poll", ["userId", "pollId"]),


    weeklyQuestions: defineTable({
        squadId: v.id("squads"),
        question: v.string(),
        channelId: v.optional(v.id("channels")),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_created", ["createdAt"]),


    weeklyAnswers: defineTable({
        questionId: v.id("weeklyQuestions"),
        userId: v.id("users"),
        content: v.string(),
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index("by_question", ["questionId"])
        .index("by_user_question", ["userId", "questionId"]),


    drops: defineTable({
        squadId: v.id("squads"),
        userId: v.id("users"),
        category: v.string(),          // extensible: "song", "movie", "book", "lifehack", "quote", "random", or any custom label
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId", "createdAt"])
        .index("by_user", ["userId", "createdAt"]),


    dropReactions: defineTable({
        dropId: v.id("drops"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_drop", ["dropId"])
        .index("by_user_drop", ["userId", "dropId"]),


    dropComments: defineTable({
        dropId: v.id("drops"),
        userId: v.id("users"),
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_drop", ["dropId", "createdAt"]),
});