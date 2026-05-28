/**
 * Design tokens for the Homie Squad app.
 * Cozy & Playful with soft modern structure: warm surfaces, gentle elevation,
 * rounded corners, breathable spacing.
 */

import '@/global.css';

import { Platform, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

// Light-only palette — warm, fresh, cozy with playful accents
const palette = {
  // Core text
  text: '#1A1A1A',                    // near-black for strong readability
  background: '#FAF7F2',              // lighter warm cream — more breathable/fresh
  backgroundElement: '#F2EDE5',       // slightly deeper for input bg etc.
  backgroundSelected: '#EBE5DA',      // selected/hover state
  textSecondary: '#5C5145',           // warm brown — readable

  // Surfaces
  outline: '#3D3833',                 // rich warm charcoal — bold but not black
  outlineLight: '#D9D2C7',            // softer dividers — less grey, more warm
  surface: '#FFFFFF',                 // card surface
  surfaceWarm: '#FFF8EC',             // creamy peach tint — cozy
  surfaceAccent: '#FFF9E8',           // very light gold surface

  // Accent — bright playful yellow
  accent: '#FFDB63',                  // bright warm yellow (hero yellow)
  accentSoft: '#FFF9E8',             // soft gold bg
  accentDark: '#F0C830',              // pressed state

  // Semantic — slightly more vivid for freshness
  success: '#22B07A',                 // fresh green
  successSoft: '#E5F9F0',
  warning: '#F0960A',
  warningSoft: '#FFF5D6',
  error: '#E04444',
  errorSoft: '#FFF0F0',

  // Text
  textTertiary: '#9A8E80',            // warm tertiary — slightly lighter for fresh contrast

  // Shadows
  shadow: '#7A6E60',

  // FAB
  fabBackground: '#6B4EE0',           // purple FAB — playful pop
  fabText: '#FFFFFF',

  // Dashed borders inside cards
  dashedBorder: '#D4CCC0',            // warm but lighter — airy
  cardBorder: '#DDD6CC',              // soft warm border — visible but gentle

  // Category tints — vivid, fresh & playful
  songBg: '#FFDDB3',    songText: '#7A4A20',    // warm amber
  movieBg: '#FFD4E0',   movieText: '#7A2848',   // playful pink
  bookBg: '#D0F2E0',    bookText: '#1E6040',    // fresh mint
  lifehackBg: '#FFEDA8', lifehackText: '#6B4A0E', // warm gold
  quoteBg: '#FFE8B0',   quoteText: '#5E4A1A',   // honey
  randomBg: '#EDE4FF',  randomText: '#4A2880',  // soft lavender

  // Chat bubbles
  bubbleOwn: '#6B4EE0',               // purple own-message bubble
  bubbleOwnText: '#FFFFFF',
  bubbleOther: '#FFFFFF',
  bubbleOtherText: '#1A1A1A',

  // Input
  inputBackground: '#FFFFFF',
  inputBorder: '#DDD6CC',             // matches cardBorder — cohesive

  // Header
  headerBackground: '#FAF7F2',        // matches background
  headerTintColor: '#1A1A1A',

  // Tab bar
  tabBarActive: '#6B4EE0',            // purple active tab — playful identity
  tabBarInactive: '#9A8E80',          // matches textTertiary
  tabBarBorder: '#E8E2DA',            // very subtle — fresh
  tabBarBackground: '#FAF7F2',        // matches background

  // Placeholder text
  placeholder: '#9A8E80',

  // Feature accent — playful purple for CTAs/badges
  featureAccent: '#6B4EE0',           // confident purple
  featureAccentDark: '#4F35BA',
};

export const Colors = {
  light: palette,
  dark: palette, // same — light-only app
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------

export const Weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

// ---------------------------------------------------------------------------
// Line heights — paired to Typography scale
// ---------------------------------------------------------------------------

export const LineHeight = {
  hero: 56,
  display: 48,
  title: 40,
  heading: 32,
  subtitle: 28,
  body: 24,
  small: 20,
  caption: 16,
} as const;

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
// Border radius — rounder to match cozy aesthetic
// ---------------------------------------------------------------------------

export const Radius = {
  sm: 8,   // was 6 — tags, chips, small elements
  md: 12,  // was 8 — inputs, small cards
  lg: 16,  // was 12 — main cards, buttons
  xl: 20,  // was 16 — modals, large surfaces
  xxl: 24, // was 20 — hero sections
  full: 9999, // pill shapes
} as const;

// ---------------------------------------------------------------------------
// Shadows — soft elevation with natural blur
// ---------------------------------------------------------------------------

export const Shadows = {
  sm: {
    offset: { width: 0, height: 1 },
    opacity: 0.08,
    radius: 3,
  },
  md: {
    offset: { width: 0, height: 2 },
    opacity: 0.10,
    radius: 6,
  },
  lg: {
    offset: { width: 0, height: 4 },
    opacity: 0.12,
    radius: 12,
  },
} as const;

// ---------------------------------------------------------------------------
// Border widths — centralized for consistent softness
// ---------------------------------------------------------------------------

export const BorderWidth = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  medium: 1.5,
} as const;

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------

export const Typography = {
  hero: 48,
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
