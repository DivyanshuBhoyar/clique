import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Redirect, Stack, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { api } from "../../../convex/_generated/api";

export default function PublicLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(
    api.users.current,
    isAuthenticated ? {} : "skip",
  );
  const segments = useSegments();

  useEffect(() => {
    if (isAuthenticated && currentUser === null) {
      signOut();
    }
  }, [isAuthenticated, currentUser, signOut]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // If authenticated, check if user has a username
  if (isAuthenticated) {
    // Still loading user data
    if (currentUser === undefined) {
      return (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    // If user document is missing entirely, wait for the signOut effect to complete.
    if (currentUser === null) {
      return (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    // User has no username — send to set-username
    if (!currentUser.name) {
      const isSetUsernameScreen =
        segments[segments.length - 1] === "set-username";
      if (!isSetUsernameScreen) {
        return <Redirect href={"/(public)/set-username" as any} />;
      }
    } else {
      return <Redirect href={"/(auth)" as any} />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="set-username" />
    </Stack>
  );
}
