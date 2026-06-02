import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    ...authTables,
    rateLimits: defineTable({
        key: v.string(),
        windowStartedAt: v.number(),
        count: v.number(),
        updatedAt: v.number(),
    })
        .index("by_key", ["key"])
        .index("by_updatedAt", ["updatedAt"]),

    userAvatars: defineTable({
        userId: v.id("users"),
        storageId: v.id("_storage"),
    }).index("by_user", ["userId"]),
    squads: defineTable({
        name: v.string(),
        passwordHash: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_created", ["createdAt"])
        .index("by_name", ["name"]),

    memberships: defineTable({
        userId: v.id("users"),
        squadId: v.id("squads"),
        nickname: v.string(),
        vibe: v.optional(v.string()),
        vibeLabel: v.optional(v.string()),
        vibeUpdatedAt: v.optional(v.number()),
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
        emoji: v.optional(v.string()),
        type: v.union(
            v.literal("main"),
            v.literal("topic"),
            v.literal("mood"),
            v.literal("thread"),
            v.literal("ephemeral"),
            v.literal("private"),
        ),
        parentChannelId: v.optional(v.id("channels")),
        expiresAt: v.optional(v.number()),
        gracePeriodMs: v.optional(v.number()),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_parent", ["parentChannelId"])
        .index("by_type", ["type"]),

    messages: defineTable({
        channelId: v.id("channels"),
        squadId: v.id("squads"),
        userId: v.id("users"),

        content: v.string(),

        type: v.union(v.literal("text"), v.literal("image"), v.literal("gif"), v.literal("system")),

        parentMessageId: v.optional(v.id("messages")),

        storageId: v.optional(v.id("_storage")),

        // GIF metadata (populated when type === "gif")
        gifUrl: v.optional(v.string()),
        gifPreviewUrl: v.optional(v.string()),
        gifId: v.optional(v.string()),
        gifTitle: v.optional(v.string()),

        nickname: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),

        createdAt: v.number(),
        editedAt: v.optional(v.number()),

        deleted: v.optional(v.boolean()),
    })
        .index("by_channel", ["channelId", "createdAt"])
        .index("by_squad", ["squadId"])
        .index("by_parent", ["parentMessageId"]),

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
        .index("by_user_message", ["userId", "messageId"])
        .index("by_user_message_emoji", ["userId", "messageId", "emoji"]),

    channelReadStatus: defineTable({
        userId: v.id("users"),
        channelId: v.id("channels"),
        lastReadAt: v.number(),
    })
        .index("by_user_channel", ["userId", "channelId"])
        .index("by_user", ["userId"])
        .index("by_channel", ["channelId"]),

    notificationPresence: defineTable({
        userId: v.id("users"),
        kind: v.union(v.literal("app"), v.literal("channel"), v.literal("dm")),
        channelId: v.optional(v.id("channels")),
        conversationId: v.optional(v.id("dmConversations")),
        lastSeenAt: v.number(),
    })
        .index("by_user_kind", ["userId", "kind"])
        .index("by_user_channel", ["userId", "channelId"])
        .index("by_user_conversation", ["userId", "conversationId"])
        .index("by_lastSeenAt", ["lastSeenAt"]),

    notes: defineTable({
        squadId: v.id("squads"),
        title: v.string(),
        content: v.string(),
        type: v.union(
            v.literal("personal"),
            v.literal("shared"),
            v.literal("friend"),
            v.literal("journal"),
        ),
        ownerId: v.id("users"),
        targetUserId: v.optional(v.id("users")),
        channelId: v.optional(v.id("channels")),
        tag: v.optional(v.string()),
        pinned: v.optional(v.boolean()),
        lastEditedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
        // Journal encryption fields (only set when encrypted === true)
        encrypted: v.optional(v.boolean()),
        nonce: v.optional(v.string()), // base64, 24-byte NaCl secretbox nonce
    })
        .index("by_owner", ["ownerId"])
        .index("by_squad", ["squadId"])
        .index("by_squad_and_updatedAt", ["squadId", "updatedAt"])
        .index("by_owner_squad", ["ownerId", "squadId"])
        .index("by_channel", ["channelId"])
        .index("by_target_user", ["targetUserId"])
        .index("by_squad_type", ["squadId", "type"])
        .index("by_owner_squad_type", ["ownerId", "squadId", "type"])
        .index("by_type_createdAt", ["type", "createdAt"]),

    noteCollaborators: defineTable({
        noteId: v.id("notes"),
        userId: v.id("users"),
        squadId: v.id("squads"),
        lastEditedAt: v.number(),
    })
        .index("by_note_and_lastEditedAt", ["noteId", "lastEditedAt"])
        .index("by_user_and_note", ["userId", "noteId"])
        .index("by_squad", ["squadId"]),

    // Stores the PBKDF2 salt and verification token for journal password-based encryption.
    // One row per user. No secrets here — salt is not sensitive, key is never stored server-side.
    journalKeyConfig: defineTable({
        userId: v.id("users"),
        salt: v.string(),              // base64, 32-byte PBKDF2 salt
        verificationCt: v.string(),    // base64, nacl.secretbox of sentinel string
        verificationNonce: v.string(), // base64, nonce for the verification ciphertext
    }).index("by_user", ["userId"]),

    quotes: defineTable({
        squadId: v.id("squads"),
        content: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
        messageId: v.optional(v.id("messages")),
    })
        .index("by_squad", ["squadId"])
        .index("by_created", ["createdAt"])
        .index("by_squad_created", ["squadId", "createdAt"]),

    memories: defineTable({
        squadId: v.id("squads"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        coverStorageId: v.optional(v.id("_storage")),
        type: v.union(
            v.literal("event"),
            v.literal("wall"),
        ),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_squad_type", ["squadId", "type"]),

    memoryItems: defineTable({
        memoryId: v.id("memories"),
        userId: v.id("users"),
        type: v.union(
            v.literal("reflection"),
            v.literal("photo"),
            v.literal("link"),
        ),
        content: v.string(),
        caption: v.optional(v.string()),
        storageId: v.optional(v.id("_storage")),
        createdAt: v.number(),
    })
        .index("by_memory", ["memoryId"]),

    confessions: defineTable({
        squadId: v.id("squads"),
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId"])
        .index("by_squad_created", ["squadId", "createdAt"])
        .index("by_created", ["createdAt"]),

    confessionReactions: defineTable({
        confessionId: v.id("confessions"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_confession", ["confessionId"])
        .index("by_user_confession", ["userId", "confessionId"]),

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
    }).index("by_poll", ["pollId"]),

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
        category: v.string(), // extensible: "song", "movie", "book", "lifehack", "quote", "random", or any custom label
        content: v.string(),
        createdAt: v.number(),
    })
        .index("by_squad", ["squadId", "createdAt"])
        .index("by_user", ["userId", "createdAt"])
        .index("by_user_squad", ["userId", "squadId", "createdAt"]),

    dropReactions: defineTable({
        dropId: v.id("drops"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_drop", ["dropId"])
        .index("by_user_drop", ["userId", "dropId"])
        .index("by_user_drop_and_emoji", ["userId", "dropId", "emoji"]),

    dropComments: defineTable({
        dropId: v.id("drops"),
        userId: v.id("users"),
        content: v.string(),
        gifUrl: v.optional(v.string()),
        gifPreviewUrl: v.optional(v.string()),
        gifId: v.optional(v.string()),
        gifTitle: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_drop", ["dropId", "createdAt"]),

    dropVotes: defineTable({
        dropId: v.id("drops"),
        userId: v.id("users"),
        value: v.union(v.literal("up"), v.literal("down")),
        createdAt: v.number(),
    })
        .index("by_drop", ["dropId"])
        .index("by_user_drop", ["userId", "dropId"]),

    commentVotes: defineTable({
        commentId: v.id("dropComments"),
        userId: v.id("users"),
        value: v.union(v.literal("up"), v.literal("down")),
        createdAt: v.number(),
    })
        .index("by_comment", ["commentId"])
        .index("by_user_comment", ["userId", "commentId"]),

    memoryReactions: defineTable({
        memoryId: v.id("memories"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_memory", ["memoryId"])
        .index("by_user_memory", ["userId", "memoryId"]),

    memoryComments: defineTable({
        memoryId: v.id("memories"),
        userId: v.id("users"),
        content: v.string(),
        gifUrl: v.optional(v.string()),
        gifPreviewUrl: v.optional(v.string()),
        gifId: v.optional(v.string()),
        gifTitle: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_memory", ["memoryId", "createdAt"]),

    memoryItemReactions: defineTable({
        itemId: v.id("memoryItems"),
        userId: v.id("users"),
        emoji: v.string(),
        createdAt: v.number(),
    })
        .index("by_item", ["itemId"])
        .index("by_user_item", ["userId", "itemId"]),

    memoryItemComments: defineTable({
        itemId: v.id("memoryItems"),
        userId: v.id("users"),
        content: v.string(),
        gifUrl: v.optional(v.string()),
        gifPreviewUrl: v.optional(v.string()),
        gifId: v.optional(v.string()),
        gifTitle: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_item", ["itemId", "createdAt"]),

    channelMemberships: defineTable({
        channelId: v.id("channels"),
        userId: v.id("users"),
        addedAt: v.number(),
    })
        .index("by_channel", ["channelId"])
        .index("by_user", ["userId"])
        .index("by_user_channel", ["userId", "channelId"]),

    bookmarks: defineTable({
        userId: v.id("users"),
        squadId: v.id("squads"),
        targetType: v.union(
            v.literal("message"),
            v.literal("drop"),
            v.literal("note"),
            v.literal("memory"),
        ),
        messageId: v.optional(v.id("messages")),
        dropId: v.optional(v.id("drops")),
        noteId: v.optional(v.id("notes")),
        memoryId: v.optional(v.id("memories")),
        createdAt: v.number(),
    })
        .index("by_user_squad", ["userId", "squadId"])
        .index("by_user_message", ["userId", "messageId"])
        .index("by_user_drop", ["userId", "dropId"])
        .index("by_user_note", ["userId", "noteId"])
        .index("by_user_memory", ["userId", "memoryId"])
        .index("by_message", ["messageId"])
        .index("by_drop", ["dropId"])
        .index("by_note", ["noteId"])
        .index("by_memory", ["memoryId"]),

    deviceKeys: defineTable({
        userId:     v.id("users"),     
        deviceId:   v.string(),        //  once per app install
        publicKey:  v.string(),        
        deviceName: v.string(),        
        pushToken:  v.optional(v.string()),
        createdAt:  v.number(),
        lastSeen:   v.number(),        
    })
        .index("by_user", ["userId"])      
        .index("by_device", ["deviceId"]),

   dmConversations: defineTable({
        participantA: v.id("users"),   
        participantB: v.id("users"),   
        lastSeq:      v.number(),      
        lastEnvelopeAt: v.optional(v.number()),
        createdAt:    v.number(),
    })
        .index("by_participants", ["participantA", "participantB"])
        .index("by_user_a", ["participantA"])
        .index("by_user_b", ["participantB"]),
    
   messageEnvelopes: defineTable({
        messageId:         v.string(),             
        conversationId:    v.id("dmConversations"),
        payloadType:       v.union(
            v.literal("message"),
            v.literal("receipt"),
            v.literal("edit"),
            v.literal("delete"),
            v.literal("reaction")
        ),
        senderId:          v.id("users"),
        senderDeviceId:    v.string(),
        senderPublicKey:   v.string(),          
        recipientId:       v.id("users"),
        recipientDeviceId: v.string(),
        ciphertext:        v.string(),              
        nonce:             v.string(),             // like random seed 
        serverTimestamp:   v.number(),          
        sequenceNumber:    v.number(),          
        delivered:         v.boolean(),             // false until recipient confirms decrypt
    })
        .index("by_recipient_device", ["recipientId", "recipientDeviceId", "delivered"])
        .index("by_conversation", ["conversationId", "sequenceNumber"]),
    
   dmSystemEvents: defineTable({
        userId:     v.id("users"),
        type:       v.string(),        // "NEW_DEVICE" | "DEVICE_REMOVED"
        deviceId:   v.string(),
        deviceName: v.string(),
        timestamp:  v.number(),
    }).index("by_user", ["userId"]),

    dmTyping: defineTable({
        conversationId: v.id("dmConversations"),
        userId:         v.id("users"),
        lastTypingAt:   v.number(),
    })
        .index("by_conversation", ["conversationId"])
        .index("by_user_conversation", ["userId", "conversationId"]),

    // DM reactions — stored in plain Convex (no encryption needed)
    // Single reaction per user per message: toggling replaces any existing reaction
    dmReactions: defineTable({
        messageId:      v.string(),                // DM message UUID (string, not a Convex doc ID)
        conversationId: v.id("dmConversations"),
        userId:         v.id("users"),
        emoji:          v.string(),
        createdAt:      v.number(),
    })
        .index("by_conversation", ["conversationId"])
        .index("by_message", ["messageId"])
        .index("by_user_and_message", ["userId", "messageId"]),

    // ─── Audio Calls ───────────────────────────────────────────────────
    callRooms: defineTable({
        channelId: v.optional(v.id("channels")),
        dmConversationId: v.optional(v.id("dmConversations")),
        hmsRoomId: v.string(),
        moderatorRoomCode: v.string(),
        participantRoomCode: v.string(),
        isActive: v.boolean(),
        startedBy: v.id("users"),
        startedAt: v.number(),
        endedAt: v.optional(v.number()),
    })
        .index("by_channel_and_isActive", ["channelId", "isActive"])
        .index("by_dmConversationId_and_isActive", ["dmConversationId", "isActive"]),

    callParticipants: defineTable({
        callRoomId: v.id("callRooms"),
        userId: v.id("users"),
        displayName: v.string(),
        joinedAt: v.number(),
        leftAt: v.optional(v.number()),
    })
        .index("by_callRoomId", ["callRoomId"])
        .index("by_callRoomId_and_userId", ["callRoomId", "userId"]),

});
