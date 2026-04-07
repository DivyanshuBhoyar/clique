import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChannelChatScreen() {
    const { id: squadId, channelId } = useLocalSearchParams<{ id: string, channelId: string }>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text>Chat in Channel: {channelId}</Text>
            </View>
            <View style={styles.messages}>
                <Text>Messages go here...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    messages: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
