/**
 * Design tokens for the Homie Squad app.
 * Cozy & Playful with neo-brutalist structure: warm surfaces, clear outlines,
 * chunky hit areas, honest hard-edged shadows, flat fills.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

// Light-only palette — warm cream with golden yellow accent
const palette = {
  // Core text
  text: '#2D2D2D',
  background: '#F5F0E8',          // warm cream (was cool grey #faf9f7)
  backgroundElement: '#EDE8DF',   // slightly deeper cream for input bg etc.
  backgroundSelected: '#E5DDD0',  // selected/hover state
  textSecondary: '#6B6050',       // warm grey-brown

  // Surfaces
  outline: '#2D2D2D',             // near-black outlines (neo-brutalist)
  outlineLight: '#C8C0B0',        // subtle dividers
  surface: '#FFFFFF',             // card surface
  surfaceWarm: '#FFF5E0',         // warm tinted surface
  surfaceAccent: '#FFF8E1',       // very soft yellow surface

  // Accent — golden yellow
  accent: '#F5C542',              // primary CTA, FAB, active states (was indigo)
  accentSoft: '#FFF8E1',          // soft yellow bg for hero cards
  accentDark: '#E0B035',          // pressed/dark state for yellow buttons

  // Semantic
  success: '#3BB897',
  successSoft: '#DFF5EE',
  warning: '#E8A838',
  warningSoft: '#FFF4DB',
  error: '#E05555',
  errorSoft: '#FDE8E8',

  // Text
  textTertiary: '#A09080',        // warm tertiary text

  // Shadows — hard-edged neo-brutalist, dark shadow for punch
  shadow: '#2D2D2D',              // black shadow (was soft purple-grey)

  // FAB
  fabBackground: '#F5C542',       // golden yellow (was indigo)
  fabText: '#2D2D2D',             // black text on yellow (was white)

  // Dashed borders inside cards
  dashedBorder: '#C0BAB0',        // warm grey dashed separator
  cardBorder: '#2D2D2D',          // explicit card border (same as outline)

  // Category tints — warmer versions matching designs
  songBg: '#FFE8CC',    songText: '#8B5E3C',    // warm amber
  movieBg: '#FFE0E8',   movieText: '#8B3C5E',   // warm pink
  bookBg: '#E0F0E8',    bookText: '#3C6B4F',    // warm mint
  lifehackBg: '#FFF3D0', lifehackText: '#7A5B1E', // warm gold
  quoteBg: '#FFF0D0',   quoteText: '#6B5A2E',   // warm honey
  randomBg: '#F0E8FF',  randomText: '#5E3C8B',  // warm lavender

  // Chat bubbles
  bubbleOwn: '#F5C542',           // golden yellow (was indigo)
  bubbleOwnText: '#2D2D2D',       // black text on yellow (was white)
  bubbleOther: '#FFFFFF',         // white (was grey)
  bubbleOtherText: '#2D2D2D',     // black text

  // Input
  inputBackground: '#FFFFFF',     // white input fields
  inputBorder: '#2D2D2D',         // black border on inputs

  // Header
  headerBackground: '#F5F0E8',    // cream (was white)
  headerTintColor: '#2D2D2D',

  // Tab bar
  tabBarActive: '#2D2D2D',        // black icon + label (was indigo)
  tabBarInactive: '#A09080',      // warm grey
  tabBarBorder: '#C8C0B0',
  tabBarBackground: '#F5F0E8',    // cream (was white)

  // Placeholder text
  placeholder: '#A09080',
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
// Shadows — hard-edged neo-brutalist (offset only, no blur, black shadow)
// ---------------------------------------------------------------------------

export const Shadows = {
  sm: {
    offset: { width: 2, height: 2 },
    opacity: 0.9,
    radius: 0,
  },
  md: {
    offset: { width: 3, height: 3 },
    opacity: 0.9,
    radius: 0,
  },
  lg: {
    offset: { width: 4, height: 4 },
    opacity: 0.9,
    radius: 0,
  },
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
