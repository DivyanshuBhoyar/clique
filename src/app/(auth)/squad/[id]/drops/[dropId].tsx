import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function DropDetailScreen() {
    const params = useLocalSearchParams();

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.text}>Drop Detail: {JSON.stringify(params)}</ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    text: { fontSize: 18, color: '#666' }
});
