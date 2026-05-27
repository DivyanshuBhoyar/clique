// src/lib/local-db.ts
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function initLocalDb() {
    db = await SQLite.openDatabaseAsync("homie_dm.db");
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dm_messages (
            messageId       TEXT PRIMARY KEY,
            conversationId  TEXT NOT NULL,
            senderId        TEXT NOT NULL,
            text            TEXT NOT NULL,
            serverTimestamp  INTEGER NOT NULL,
            sequenceNumber  INTEGER NOT NULL,
            status          TEXT DEFAULT 'received',
            editedAt        INTEGER,
            deletedAt       INTEGER,
            replyToMessageId TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_dm_conv
            ON dm_messages (conversationId, sequenceNumber);
        CREATE INDEX IF NOT EXISTS idx_dm_conv_desc
            ON dm_messages (conversationId, sequenceNumber DESC);

        CREATE TABLE IF NOT EXISTS dm_read_state (
            conversationId TEXT PRIMARY KEY,
            lastReadSeq    INTEGER NOT NULL DEFAULT 0
        );
    `);
}

export async function hasMessage(messageId: string): Promise<boolean> {
    if (!db) throw new Error("DB not initialized");
    const row = await db.getFirstAsync<{ c: number }>(
        "SELECT COUNT(*) as c FROM dm_messages WHERE messageId = ?", [messageId]
    );
    return (row?.c ?? 0) > 0;
}

export async function insertMessage(msg: {
    messageId: string; conversationId: string; senderId: string;
    text: string; serverTimestamp: number; sequenceNumber: number; status?: string;
}) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync(
        `INSERT INTO dm_messages
            (messageId, conversationId, senderId, text, serverTimestamp, sequenceNumber, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(messageId) DO UPDATE SET
            serverTimestamp = CASE
                WHEN dm_messages.sequenceNumber <= 0 THEN excluded.serverTimestamp
                ELSE dm_messages.serverTimestamp
            END,
            sequenceNumber = CASE
                WHEN dm_messages.sequenceNumber <= 0 THEN excluded.sequenceNumber
                ELSE dm_messages.sequenceNumber
            END,
            status = CASE
                WHEN dm_messages.status = 'received' THEN excluded.status
                ELSE dm_messages.status
            END`,
        [msg.messageId, msg.conversationId, msg.senderId, msg.text,
         msg.serverTimestamp, msg.sequenceNumber, msg.status ?? "received"]
    );
}

export async function getMessagesPage(
    conversationId: string,
    opts: { beforeSeq?: number; beforeTimestamp?: number; limit?: number } = {},
) {
    if (!db) throw new Error("DB not initialized");
    return db.getAllAsync<{
        messageId: string; conversationId: string; senderId: string;
        text: string; serverTimestamp: number; sequenceNumber: number; status: string;
    }>(
        `SELECT * FROM dm_messages
         WHERE conversationId = ?
            AND (
                ? IS NULL
                OR serverTimestamp < ?
                OR (serverTimestamp = ? AND sequenceNumber < ?)
            )
         ORDER BY serverTimestamp DESC, sequenceNumber DESC
         LIMIT ?`,
        [
            conversationId,
            opts.beforeTimestamp ?? null,
            opts.beforeTimestamp ?? null,
            opts.beforeTimestamp ?? null,
            opts.beforeSeq ?? null,
            opts.limit ?? 50,
        ]
    );
}

export async function updateMessageStatus(messageId: string, status: string) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync("UPDATE dm_messages SET status = ? WHERE messageId = ?", [status, messageId]);
}

export async function editMessage(messageId: string, newText: string) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync(
        "UPDATE dm_messages SET text = ?, editedAt = ? WHERE messageId = ?",
        [newText, Date.now(), messageId]
    );
}

export async function deleteMessage(messageId: string) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync(
        "UPDATE dm_messages SET text = '', deletedAt = ?, status = 'deleted' WHERE messageId = ?",
        [Date.now(), messageId]
    );
}

export async function markConversationRead(conversationId: string, lastReadSeq: number) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync(
        `INSERT INTO dm_read_state (conversationId, lastReadSeq)
         VALUES (?, ?)
         ON CONFLICT(conversationId) DO UPDATE SET lastReadSeq = excluded.lastReadSeq`,
        [conversationId, lastReadSeq]
    );
}

/**
 * Mark all own messages up to a sequence number as "read".
 * Called when a read receipt is received from the other user.
 */
export async function markMessagesReadUpTo(conversationId: string, sequenceNumber: number) {
    if (!db) throw new Error("DB not initialized");
    await db.runAsync(
        `UPDATE dm_messages SET status = 'read'
         WHERE conversationId = ? AND sequenceNumber <= ? AND status != 'read'`,
        [conversationId, sequenceNumber]
    );
}
