import { StyleSheet, View } from 'react-native';

import { EphemeralCountdown } from '@/components/chat/ephemeral-countdown';
import { MessageInput } from '@/components/chat/message-input';
import { ChatReplyTarget } from '@/components/chat/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { formatDeleteIn } from '@/utils/time';

interface ChannelExpiryState {
    isExpired: boolean;
    expiresAt?: number | null;
    deleteAt?: number | null;
}

interface ChatComposerProps {
    isEphemeral: boolean;
    channelExpiry?: ChannelExpiryState | null;
    replyTarget: ChatReplyTarget | null;
    onTyping?: () => void;
    onCancelReply: () => void;
    onSend: (content: string, parentMessageId?: Id<'messages'>) => Promise<void>;
    onSendImage: (storageId: Id<'_storage'>, caption?: string, parentMessageId?: Id<'messages'>) => Promise<void>;
}

export function ChatComposer({
    isEphemeral,
    channelExpiry,
    replyTarget,
    onTyping,
    onCancelReply,
    onSend,
    onSendImage,
}: ChatComposerProps) {
    const theme = useTheme();
    const isExpired = channelExpiry?.isExpired ?? false;

    if (isEphemeral && isExpired) {
        return (
            <View style={[styles.expiredBanner, { borderTopColor: theme.outlineLight }]}>
                <ThemedText type="small" style={{ color: theme.error, fontWeight: Weight.semibold }}>
                    This room has expired
                </ThemedText>
                {channelExpiry?.deleteAt && (
                    <ThemedText type="caption" themeColor="textSecondary">
                        Deletes in {formatDeleteIn(channelExpiry.deleteAt - Date.now())}
                    </ThemedText>
                )}
            </View>
        );
    }

    return (
        <>
            <MessageInput
                onTyping={onTyping}
                replyTo={replyTarget}
                onCancelReply={onCancelReply}
                onSend={(content) => onSend(content, replyTarget?.id)}
                onSendImage={(storageId, caption) => onSendImage(storageId, caption, replyTarget?.id)}
            />

            {isEphemeral && channelExpiry?.expiresAt && (
                <EphemeralCountdown expiresAt={channelExpiry.expiresAt} />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    expiredBanner: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderTopWidth: 1.5,
    },
});
