import { Id } from '@/convex/_generated/dataModel';

export interface ChatSelectedMessage {
    id: string;
    isOwn: boolean;
    nickname?: string;
    content: string;
    deleted?: boolean;
    type?: 'text' | 'image' | 'system';
}

export interface ChatReplyTarget {
    id: Id<'messages'>;
    nickname?: string;
    content: string;
}

export interface ChatMessageSnapshot {
    _id: Id<'messages'>;
    userId: string;
    nickname?: string;
    content: string;
    deleted?: boolean;
    type?: 'text' | 'image' | 'system';
}
