import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from "convex/react";
import { Slot } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

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
          : undefined
      }
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Slot />
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}
