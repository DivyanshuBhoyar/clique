import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

interface MessageItemProps {
    messageId: string;
    nickname?: string;
    content: string;
    createdAt: number;
    deleted?: boolean;
    isOwnMessage: boolean;
}

export function MessageItem({ nickname, content, createdAt, deleted, isOwnMessage }: MessageItemProps) {
    const time = new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <ThemedView style={[styles.container, isOwnMessage && styles.containerRight]}>
            {!isOwnMessage && (
                <ThemedText type="smallBold">{nickname ?? 'Unknown'}</ThemedText>
            )}
            <ThemedText style={isOwnMessage && !deleted ? styles.ownMessage : styles.content}>
                {content}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{time}</ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        maxWidth: '70%',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderBottomRightRadius: 16,
    },
    containerRight: {
        alignSelf: 'flex-end',
        borderTopLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 4,
    },
    content: {
        marginTop: 2,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'transparent',
    },
    ownMessage: {
        color: '#fff',
        backgroundColor: '#55a5faff',
        borderWidth: 0,
    },
    deleted: {
        opacity: 0.5,
    },
});
