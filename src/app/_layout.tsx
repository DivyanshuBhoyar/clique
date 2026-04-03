import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from "convex/react";
import { Slot } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

// Required for OAuth on mobile: detects the redirect deep-link and closes
// the browser session so Convex Auth can complete the sign-in flow.
if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

import { AnimatedSplashOverlay } from '@/components/animated-icon';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ConvexAuthProvider
      client={convex}
      storage={
        Platform.OS === "android" || Platform.OS === "ios"
          ? secureStorage
          : window.localStorage
      }
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}
