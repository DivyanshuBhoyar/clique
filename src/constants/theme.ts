/**
 * Design tokens for the Clique Cove app.
 * Cozy & Playful with neo-brutalist structure: warm surfaces, clear outlines,
 * chunky hit areas, honest hard-edged shadows, flat fills.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

// Light-only palette — warm pastels with confident accents
const palette = {
  // Existing tokens (DO NOT RENAME — components depend on these)
  text: '#2d2d3a',
  background: '#faf9f7',
  backgroundElement: '#f0eff4',
  backgroundSelected: '#e4e2ec',
  textSecondary: '#6b6b80',

  // Surfaces
  outline: '#2d2d3a',
  outlineLight: '#d5d3de',
  surface: '#ffffff',
  surfaceWarm: '#fff5eb',
  surfaceAccent: '#eef0ff',

  // Accent — confident indigo
  accent: '#5b5bd6',
  accentSoft: '#ededfc',

  // Semantic
  success: '#3bb897',
  successSoft: '#dff5ee',
  warning: '#e8a838',
  warningSoft: '#fff4db',
  error: '#e05555',
  errorSoft: '#fde8e8',

  // Text
  textTertiary: '#a0a0b2',

  // Shadows — soft, not harsh
  shadow: '#c8c8d4',

  // FAB
  fabBackground: '#5b5bd6',
  fabText: '#ffffff',

  // Category tints — Song (lavender)
  songBg: '#ede9fe',
  songText: '#6d28d9',
  // Category tints — Movie (pink)
  movieBg: '#fce7f3',
  movieText: '#be185d',
  // Category tints — Book (mint)
  bookBg: '#d1fae5',
  bookText: '#065f46',
  // Category tints — Life hack (peach)
  lifehackBg: '#fef3c7',
  lifehackText: '#92400e',
  // Category tints — Quote (sky)
  quoteBg: '#e0f2fe',
  quoteText: '#075985',
  // Category tints — Random (lilac)
  randomBg: '#f3e8ff',
  randomText: '#7e22ce',

  // Chat bubbles
  bubbleOwn: '#5b5bd6',
  bubbleOwnText: '#ffffff',
  bubbleOther: '#f0eff4',
  bubbleOtherText: '#2d2d3a',

  // Input
  inputBackground: '#f0eff4',
  inputBorder: '#d5d3de',

  // Header
  headerBackground: '#ffffff',
  headerTintColor: '#2d2d3a',

  // Tab bar
  tabBarActive: '#5b5bd6',
  tabBarInactive: '#a0a0b2',
  tabBarBorder: '#d5d3de',
  tabBarBackground: '#ffffff',

  // Placeholder text
  placeholder: '#999999',
};

export const Colors = {
  light: palette,
  dark: palette, // same — light-only app
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ---------------------------------------------------------------------------
// Spacing — 4pt grid
// ---------------------------------------------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,

  // Legacy aliases — keep for backward compat
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadows — hard-edged neo-brutalist (offset only, no blur)
// ---------------------------------------------------------------------------

export const Shadows = {
  sm: {
    offset: { width: 2, height: 2 },
    opacity: 1,
    radius: 0,
  },
  md: {
    offset: { width: 3, height: 3 },
    opacity: 1,
    radius: 0,
  },
  lg: {
    offset: { width: 4, height: 4 },
    opacity: 1,
    radius: 0,
  },
} as const;

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------

export const Typography = {
  display: 40,
  title: 32,
  heading: 24,
  subtitle: 20,
  body: 16,
  small: 14,
  caption: 12,
} as const;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
