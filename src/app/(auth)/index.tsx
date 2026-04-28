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
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuthActions();

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  const joinSquad = useMutation(api.squad.joinSquad);
  const userSquads = useQuery(api.squad.getUserSquads);

  useEffect(() => {
    if (hasRedirected) return;
    if (!userSquads) return;

    const redirect = async () => {
      let targetId: string | null = null;

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
          <View style={[styles.heroSection, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="title" style={styles.title}>
              Homie Squad
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Are you ready to vibe?
            </ThemedText>
          </View>

          {userSquads && userSquads.length > 0 && (
            <View style={styles.squadsList}>
              <ThemedText type="bodyBold" style={{ marginBottom: Spacing.sm }}>Your Squads</ThemedText>
              {userSquads.map((entry) => {
                if (!entry.squad) return null;
                return (
                  <TouchableOpacity
                    key={entry.squad._id}
                    style={[styles.squadCard, {
                      backgroundColor: theme.surface,
                      borderColor: theme.outline,
                      shadowColor: theme.shadow,
                      shadowOffset: Shadows.sm.offset,
                      shadowOpacity: Shadows.sm.opacity,
                      shadowRadius: Shadows.sm.radius,
                      elevation: 3,
                    }]}
                    onPress={() => router.push(`/squad/${entry.squad!._id}/chat` as any)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.squadCardName}>{entry.squad.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">as {entry.membership.nickname}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.actionContainer}>
            <Button
              title="Create a New Squad"
              color={theme.accent}
              onPress={handleCreateSquad}
            />

            {!showJoinForm ? (
              <Button
                title="Join Squad By Name"
                color={theme.success}
                onPress={() => setShowJoinForm(true)}
              />
            ) : (
              <View style={[styles.joinForm, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                <ThemedText type="smallBold" style={{ marginTop: Spacing.sm }}>Squad Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                  value={squadName}
                  onChangeText={setSquadName}
                  placeholder="e.g. Weekend Warriors"
                  placeholderTextColor={theme.textTertiary}
                />

                <ThemedText type="smallBold" style={{ marginTop: Spacing.sm }}>Password</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Secret password"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                />

                <ThemedText type="smallBold" style={{ marginTop: Spacing.sm }}>Your Nickname</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="What should we call you?"
                  placeholderTextColor={theme.textTertiary}
                />

                <Button
                  title={isJoining ? "Joining..." : "Join"}
                  color={theme.success}
                  onPress={submitJoinSquad}
                />
                <Button
                  title="Cancel"
                  color={theme.textTertiary}
                  onPress={() => setShowJoinForm(false)}
                />
              </View>
            )}
          </View>

          <View style={styles.signOutSection}>
            <Button
              title="Sign Out"
              color={theme.error}
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
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },
  scrollContent: {
    paddingVertical: Spacing.six,
    gap: Spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xxl,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  title: {
    textAlign: 'center',
  },
  squadsList: {
    gap: Spacing.sm,
  },
  squadCard: {
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  squadCardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    gap: Spacing.lg,
    width: '100%',
  },
  joinForm: {
    padding: Spacing.xxl,
    borderRadius: Radius.lg,
    borderWidth: 2,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  signOutSection: {
    paddingTop: Spacing.sm,
  },
});
