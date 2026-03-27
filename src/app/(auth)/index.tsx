import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const joinSquad = useMutation(api.squad.joinSquad);


  const handleCreateSquad = () => {
    router.push(`/create-squad`);
  };

  const submitJoinSquad = async () => {
    if (!squadName || !password || !nickname) {
      alert("Please fill all fields to join.");
      return;
    }

  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Homie Squad
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Are you ready to vibe?
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actionContainer}>
          <Button
            title="Create a New Squad"
            color="#007AFF"
            onPress={handleCreateSquad}
          />

          {!showJoinForm ? (
            <Button
              title="Join Squad By Name"
              color="#34C759"
              onPress={() => setShowJoinForm(true)}
            />
          ) : (
            <View style={styles.joinForm}>
              <ThemedText style={styles.formLabel}>Squad Name</ThemedText>
              <TextInput
                style={styles.input}
                value={squadName}
                onChangeText={setSquadName}
                placeholder="e.g. Weekend Warriors"
                placeholderTextColor="#888"
              />

              <ThemedText style={styles.formLabel}>Password</ThemedText>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Secret password"
                placeholderTextColor="#888"
                secureTextEntry
              />

              <ThemedText style={styles.formLabel}>Your Nickname</ThemedText>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="What should we call you?"
                placeholderTextColor="#888"
              />

              <Button
                title={isJoining ? "Joining..." : "Join"}
                color="#34C759"
                onPress={submitJoinSquad}
              />
              <Button
                title="Cancel"
                color="#888"
                onPress={() => setShowJoinForm(false)}
              />
            </View>
          )}
        </ThemedView>

        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            color="#FF3B30"
            onPress={() => signOut()}
          />
        </View>

        {/* {userSquads && userSquads.length > 0 && (
          <ThemedView style={styles.squadsList}>
            <ThemedText style={styles.sectionTitle}>Your Squads</ThemedText>
            {userSquads.map((squad) => (
              <Button
                key={squad._id}
                title={`${squad.name} (as ${squad.nickname})`}
                color="#8E8E93"
                onPress={() => router.push(`/squad/${squad._id}/chat` as any)}
                style={styles.squadItem}
              />
            ))}
          </ThemedView>
        )} */}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  title: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  actionContainer: {
    gap: Spacing.four,
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 20,
  },
  joinForm: {
    backgroundColor: '#fff',
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  squadsList: {
    marginTop: Spacing.six,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  squadItem: {
    marginBottom: Spacing.two,
  },
  signOutSection: {
    paddingHorizontal: 20,
    marginTop: Spacing.four,
  },
});
