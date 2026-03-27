import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function NotesScreen() {
    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.text}>Notes Tab Placeholder</ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    text: { fontSize: 18, color: '#666' }
});
