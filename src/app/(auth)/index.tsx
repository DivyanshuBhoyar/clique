import { useAuthActions } from '@convex-dev/auth/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [hasRedirected, setHasRedirected] = useState(false);

  const joinSquad = useMutation(api.squad.joinSquad);
  const userSquads = useQuery(api.squad.getUserSquads);

  // Auto-redirect: prefer last visited squad, fall back to first squad
  useEffect(() => {
    if (hasRedirected) return;
    if (!userSquads) return;

    const redirect = async () => {
      let targetId: string | null = null;

      // Try last visited squad stored in AsyncStorage
      const lastId = await AsyncStorage.getItem('lastSquadId');
      if (lastId && userSquads.some(e => e.squad?._id === lastId)) {
        targetId = lastId;
      } else if (userSquads.length > 0 && userSquads[0]?.squad) {
        targetId = userSquads[0].squad._id;
      }

      if (targetId) {
        setHasRedirected(true);
        router.replace(`/squad/${targetId}/chat` as any);
      }
    };

    redirect();
  }, [userSquads, hasRedirected]);

  const handleCreateSquad = () => {
    router.push(`/create-squad`);
  };

  const submitJoinSquad = async () => {
    if (!squadName || !password || !nickname) {
      alert("Please fill all fields to join.");
      return;
    }

    try {
      setIsJoining(true);
      const squadId = await joinSquad({ squadName, password, nickname });

      setShowJoinForm(false);
      setSquadName('');
      setPassword('');
      setNickname('');

      router.push(`/squad/${squadId}/chat` as any);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join squad");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              Homie Squad
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Are you ready to vibe?
            </ThemedText>
          </ThemedView>

          {/* Joined Squads */}
          {userSquads && userSquads.length > 0 && (
            <ThemedView style={styles.squadsList}>
              <ThemedText style={styles.sectionTitle}>Your Squads</ThemedText>
              {userSquads.map((entry) => {
                if (!entry.squad) return null;
                return (
                  <TouchableOpacity
                    key={entry.squad._id}
                    style={styles.squadCard}
                    onPress={() => router.push(`/squad/${entry.squad!._id}/chat` as any)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.squadCardName}>{entry.squad.name}</ThemedText>
                    <ThemedText style={styles.squadCardNickname}>as {entry.membership.nickname}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          )}

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
        </ScrollView>
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
  },
  scrollContent: {
    paddingVertical: Spacing.six,
    gap: Spacing.four,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  squadsList: {
    backgroundColor: 'transparent',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  squadCard: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: '#eee',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  squadCardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  squadCardNickname: {
    fontSize: 13,
    color: '#888',
  },
  actionContainer: {
    gap: Spacing.three,
    backgroundColor: 'transparent',
    width: '100%',
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
  signOutSection: {
    paddingTop: Spacing.two,
  },
});
