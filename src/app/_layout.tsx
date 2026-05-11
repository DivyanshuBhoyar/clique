import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/ui/toast-provider';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from "convex/react";
import { Slot } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React from 'react';
import { Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

// Required for OAuth on mobile: detects the redirect deep-link and closes
// the browser session so Convex Auth can complete the sign-in flow.
if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export default function RootLayout() {
  const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F5F0E8' } };

  return (
    <ConvexAuthProvider
      client={convex}
      storage={
        Platform.OS === "android" || Platform.OS === "ios"
          ? secureStorage
          : window.localStorage
      }
    >
      <KeyboardProvider>
        <ThemeProvider value={navTheme}>
          <AnimatedSplashOverlay />
          <Slot />
          <ToastHost />
        </ThemeProvider>
      </KeyboardProvider>
    </ConvexAuthProvider>
  );
}
