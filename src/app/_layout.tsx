import { ToastHost } from '@/components/ui/toast-provider';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from "convex/react";
import Constants from 'expo-constants';
import { Slot, type ErrorBoundaryProps } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

// Required for OAuth on mobile: detects the redirect deep-link and closes
// the browser session so Convex Auth can complete the sign-in flow.
if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

function getConvexUrl() {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL
    ?? Constants.expoConfig?.extra?.convexUrl;

  if (!convexUrl) {
    throw new Error('Missing Convex URL. Set EXPO_PUBLIC_CONVEX_URL or expo.extra.convexUrl.');
  }

  return convexUrl;
}

const convex = new ConvexReactClient(getConvexUrl(), {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Clique hit a startup error</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable style={styles.retryButton} onPress={retry} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

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
          <Slot />
          <ToastHost />
        </ThemeProvider>
      </KeyboardProvider>
    </ConvexAuthProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#FAF7F2',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: '#6F6257',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F5C542',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D2D2D',
  },
});
