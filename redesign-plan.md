# Clique Cove — Design Theme Overhaul (Revised)

## Decisions Locked In
- **Icons**: Lucide React Native (`lucide-react-native`)
- **Default landing**: Chat channel list (no Squad Home screen for now)
- **Auth providers**: Email OTP + Google OAuth (no Apple)
- **Priority**: 5 main tabs first → auth/onboarding/squad selection later
- **Masonry**: Manual 2-column split (no new dependency)

---

## Streamlining Suggestions

> [!TIP]
> **How to cut this from weeks to days:**

1. **Phase 0 (tokens) gives 60% of the visual change for 5% of the effort.** Just changing background, accent, shadow, and border-radius in `theme.ts` instantly updates every screen because all components read from it. Do this first, always.

2. **Build 5 shared components once, reuse 15+ times.** The designs repeat the same patterns everywhere:
   - `ScreenHeader` → used on every single screen (12+ uses)
   - `DashedSeparator` → used inside every card type (8+ uses)
   - `EmojiReactionStrip` → replaces `DropReactions` + `MessageReactions` + memory reactions (6+ uses)
   - `CommentSection` + `CommentInputBar` → Drop detail, Memory detail, Event scrapbook (3+ uses)
   - `FilterChips` → Drops, Notes (2+ uses)

3. **Batch similar components.** All card components (DropCard, NoteCard, WallCard, EventCard, PollCard, ConfessionCard) follow the same skeleton: white bg, 2px border, 16px radius, dashed separator, footer row. Style one card fully, then copy the pattern to the rest in rapid succession.

4. **Don't restyle and refactor simultaneously.** This is purely visual — don't restructure navigation, add features, or change data flow at the same time. Touch only styles and JSX structure.

5. **Test after each phase, not at the end.** Run on device after completing each phase. Catching a broken style early takes 2 minutes; finding it after 40 file changes takes an hour.

---

## Phase 0 — Foundation (Design Tokens + Install Lucide)
**Effort: ~30 min | Impact: Entire app shifts to warm palette immediately**

> **Learning**: Design tokens are the single source of truth. React Native has no CSS variables, so we use a TypeScript constants file. Every component calls `useTheme()` which returns these values. Change them once → everywhere updates.

### Install lucide-react-native
```bash
npx expo install lucide-react-native react-native-svg
```

### [MODIFY] [theme.ts](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/constants/theme.ts)

**Color changes:**
| Token | Current | New |
|---|---|---|
| `background` | `#faf9f7` | `#F5F0E8` |
| `accent` | `#5b5bd6` | `#F5C542` |
| `accentSoft` | `#ededfc` | `#FFF8E1` |
| `surface` | `#ffffff` | `#ffffff` |
| `surfaceWarm` | `#fff5eb` | `#FFF5E0` |
| `outline` | `#2d2d3a` | `#2D2D2D` |
| `shadow` | `#c8c8d4` | `#2D2D2D` |
| `bubbleOwn` | `#5b5bd6` | `#F5C542` |
| `bubbleOwnText` | `#ffffff` | `#2D2D2D` |
| `bubbleOther` | `#f0eff4` | `#ffffff` |
| `fabBackground` | `#5b5bd6` | `#F5C542` |
| `fabText` | `#ffffff` | `#2D2D2D` |
| `headerBackground` | `#ffffff` | `#F5F0E8` |
| `tabBarActive` | `#5b5bd6` | `#2D2D2D` |
| `tabBarBackground` | `#ffffff` | `#F5F0E8` |

**Add new tokens:**
```typescript
accentDark: '#E0B035',      // pressed state for yellow buttons
dashedBorder: '#B5B0A8',    // dashed lines inside cards
cardBorder: '#2D2D2D',      // explicit card border color

// Category tints (warmer versions matching designs)
songBg: '#FFE8CC',    songText: '#8B5E3C',
movieBg: '#FFE0E8',   movieText: '#8B3C5E',
bookBg: '#E0F0E8',    bookText: '#3C6B4F',
lifehackBg: '#FFF3D0', lifehackText: '#7A5B1E',
quoteBg: '#FFF0D0',   quoteText: '#6B5A2E',
randomBg: '#F0E8FF',  randomText: '#5E3C8B',
```

**Update Radius:**
```typescript
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,    // was 12 — cards in designs are rounder
  xl: 20,    // was 16
  xxl: 24,   // was 20
  full: 9999,
} as const;
```

**Update Shadows** (softer, warm):
```typescript
export const Shadows = {
  sm: { offset: { width: 2, height: 2 }, opacity: 0.15, radius: 0 },
  md: { offset: { width: 3, height: 3 }, opacity: 0.2, radius: 0 },
  lg: { offset: { width: 4, height: 4 }, opacity: 0.2, radius: 0 },
} as const;
```

### [MODIFY] [_layout.tsx (root)](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/_layout.tsx)
- Update `navTheme` background: `'#faf9f7'` → `'#F5F0E8'`

### [MODIFY] [button.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/button.tsx)
- Add `variant` prop: `'primary'` (yellow fill, black text, 2px black border), `'secondary'` (white fill, black text, 2px black border), `'dark'` (black fill, white text)
- Increase border radius to `Radius.lg` (16px)
- Add 2px black border to all variants
- Full-width by default

### [MODIFY] [card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/ui/card.tsx)
- Update `borderRadius` to `Radius.lg`
- Update shadow to use new softer values

### [MODIFY] [fab.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/ui/fab.tsx)
- Yellow bg, black border, black "+" text (reads from updated tokens)

---

## Phase 1 — Shared Components (Build Once, Use Everywhere)
**Effort: ~1-2 hours | Impact: Unlocks rapid restyling of all tabs**

> **Learning**: In React Native, you build reusable components with `StyleSheet.create()` for static styles and inline style arrays `[styles.base, { dynamic }]` for dynamic parts. Props control variants. This is the equivalent of CSS utility classes but in JS.

### [NEW] `src/components/ui/screen-header.tsx`
Reusable header matching the design pattern: `← Title 🎁  +`
```
Props:
  title: string           // "Drops 🎁"
  onBack?: () => void     // renders ← if provided
  rightIcon?: LucideIcon  // renders icon button if provided
  onRightPress?: () => void
```
- Cream background (`theme.headerBackground`)
- Back button: rounded square, 2px black border, ChevronLeft icon
- Title: centered, bold, with emoji
- Right button: rounded square, 2px black border, icon inside
- Height: 52px + SafeArea inset

### [NEW] `src/components/ui/dashed-separator.tsx`
Simple dashed line:
```typescript
<View style={{
  borderBottomWidth: 1.5,
  borderBottomColor: theme.dashedBorder,
  borderStyle: 'dashed',
  marginVertical: Spacing.md,
}} />
```

### [NEW] `src/components/ui/emoji-reaction-strip.tsx`
Replaces existing `DropReactions` and `MessageReactions`:
```
Props:
  reactions: { emoji: string; count: number; reacted: boolean }[]
  onToggle: (emoji: string) => void
  onAdd: () => void     // opens picker
  compact?: boolean     // smaller for chat bubbles
```
- Horizontal row of rounded pills: emoji + count
- Active pill: filled bg, inactive: outline
- Dashed circle "+" button at end
- Wraps to next line if many reactions

### [NEW] `src/components/ui/filter-chips.tsx`
Horizontal scrollable chip row:
```
Props:
  chips: { label: string; emoji?: string }[]
  activeIndex: number
  onSelect: (index: number) => void
```
- Active chip: black bg, white text (or yellow bg, black text — matches designs)
- Inactive chip: white bg, black text, 2px black border
- Pill-shaped (Radius.full)
- ScrollView horizontal

### [NEW] `src/components/ui/comment-section.tsx`
Shared comment list + input:
```
Props:
  comments: { id, nickname, avatarUrl, content, createdAt, heartCount }[]
  onAddComment: (content: string) => Promise<void>
  onHeartComment: (commentId: string) => void
```
- "Comments" heading
- List of white cards (2px border) with avatar, @name, time, content, ❤️ count
- Bottom input bar: avatar + rounded TextInput + yellow send button (Lucide `Send` icon)

### [MODIFY] `src/components/ui/segmented-control.tsx`
Add `variant` prop:
- `'filled'` (current — for Event scrapbook Reflections/Photos/Links)
- `'underline'` (new — for Memory Wall/Events/Fun tabs): text only, active tab has black underline

### [MODIFY] `src/components/squad-header.tsx`
**Replace** current minimal header with the new `ScreenHeader` component throughout. The old `SquadHeader` can be deprecated or made a thin wrapper.

---

## Phase 2 — Tab Bar + Main Tab Screens
**Effort: ~3-5 hours | This is the bulk of the work**

> **Learning**: Each tab screen is a route file under `squad/[id]/`. The tab bar itself is configured in `_layout.tsx`. Expo Router uses file-based routing — the file name IS the route. Styles in React Native cascade through `style` arrays — later styles override earlier ones.

### [MODIFY] [_layout.tsx (squad tabs)](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/_layout.tsx)
- Switch from PNG tab icons to Lucide icons:
  ```typescript
  import { MessageCircle, Zap, Heart, BookOpen, Sparkles } from 'lucide-react-native';
  ```
- Tab order: Chat, Drops, Memories, Notes, Vibes
- Active: black icon (filled via `fill` prop), bold label
- Inactive: grey icon (outline), normal label
- Cream background, thin top border
- Remove old PNG icon imports

---

### 2A — Chat Tab

#### [MODIFY] [chat/index.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/chat/index.tsx)
- Replace `SquadHeader` with `ScreenHeader` (title: "🏠 The Cove", right icon: `Users`)
- Update channel cards: white bg, 2px border, 16px radius
- Update search bar styling (rounded, cream bg, Lucide `Search` icon)
- Update "Leave Squad" to match design (text link, not button)

#### [MODIFY] [chat/[channelId].tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/chat/[channelId].tsx)
- Add `ScreenHeader` with squad name + online status subtitle
- Update message list background to cream

#### [MODIFY] [message-item.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/chat/message-item.tsx)
- Own messages: yellow bubble (`theme.bubbleOwn`), no border, right-aligned
- Others: white bubble, 2px black border, left-aligned
- Show "nickname 🍑" label above others' messages
- Avatar on left for others (already exists)
- Use `EmojiReactionStrip` (compact mode) instead of `MessageReactions`

#### [MODIFY] [message-input.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/chat/message-input.tsx)
- Left: "+" button (Lucide `Plus`) for attachments
- Center: rounded input, cream bg, placeholder "Say something cozy… 🫖", emoji button (Lucide `Smile`)
- Right: yellow circular send button with Lucide `Send` icon
- Bottom bar: cream bg, thin top border

#### [MODIFY] [typing-indicator.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/chat/typing-indicator.tsx)
- "maya 🍑 is typing" with animated dots, white bubble on left

#### [MODIFY] [message-reactions.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/chat/message-reactions.tsx)
- Replace with `EmojiReactionStrip` compact variant (or inline the style)

#### [MODIFY] [create-channel-modal.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/chat/create-channel-modal.tsx)
- Update to new card/button styles, yellow CTA

---

### 2B — Drops Tab

#### [MODIFY] [drops/index.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/drops/index.tsx)
- `ScreenHeader` title: "Drops 🎁", right: `Plus` icon
- Add `FilterChips` below header: All ✨, Song 🎵, Movie 🎬, Book 📚, Quote 💬, Life Hack 💡
- Add filtering state + logic (filter `drops` array by category)

#### [MODIFY] [drop-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/drops/drop-card.tsx)
- White card, 2px black border, Radius.lg
- Category chip top-left (colored pill)
- For Song category: album art thumbnail on right (if image exists)
- Title bold, "added by @name · time" subtitle
- Content text
- `DashedSeparator`
- Footer: ❤️ count + 💬 count left, Lucide `Bookmark` right

#### [MODIFY] [category-chip.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/drops/category-chip.tsx)
- Rounded pill with emoji + label on warm pastel bg

#### [MODIFY] [drops/[dropId].tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/drops/[dropId].tsx)
- `ScreenHeader`: "Drop 🎁", right: `MoreHorizontal` icon
- Full drop card (no truncation) with album art for songs
- `EmojiReactionStrip` with counts
- Upvote/downvote row + "4 comments 💬" pill
- `CommentSection` below
- `CommentInputBar` at bottom

#### [MODIFY] [drops/new.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/drops/new.tsx)
- `ScreenHeader`: "New Drop 🎁"
- Form cards with new styling (same pattern as Create Squad)

---

### 2C — Notes Tab

#### [MODIFY] [notes/index.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/notes/index.tsx)
- `ScreenHeader`: "Notes 📝", right: `Plus` icon
- Search bar with Lucide `Search` icon + filter/sort button (Lucide `SlidersHorizontal`)
- `FilterChips`: All, 📌 Pinned, Recent, Mine
- Replace `SegmentedControl` (Mine/Ours tabs) with filter chips or keep as tabs
- Note cards with new styling

#### [MODIFY] [note-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/notes/note-card.tsx)
- White card, 2px border, Radius.lg
- Colored left border accent (varies per note)
- Title bold with emoji, "📌 pinned" orange badge if pinned
- Content preview (2 lines)
- `DashedSeparator`
- Footer: avatar(s) + name left, time right

#### [MODIFY] [shared-note-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/notes/shared-note-card.tsx)
- Same pattern as note-card, add stacked avatars for collaborators

#### [MODIFY] [journal-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/notes/journal-card.tsx)
- Warm card with new design tokens

#### [MODIFY] [notes/[noteId].tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/notes/[noteId].tsx)
- `ScreenHeader`: "Note 📝", right: `Check` icon (save)
- Formatting toolbar row (B, I, H1, lists) with Lucide icons
- "📌 Pinned" badge
- `EmojiReactionStrip` on the note
- `DashedSeparator`
- Editable content area
- Footer: "@name · time · Editing…" + "● Auto-saved · just now"

#### [MODIFY] [notes/new.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/notes/new.tsx) & [notes/journals.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/notes/journals.tsx)
- Apply same ScreenHeader + card styling

---

### 2D — Memories Tab

#### [MODIFY] [memories/index.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/memories/index.tsx)
- `ScreenHeader`: "Memory Wall 💛", right: `Plus` icon
- `SegmentedControl` underline variant: Wall / Events / Fun
- "🎋 24 memories" count row + "≡ Recent" sort button
- **Wall tab**: Convert FlatList to 2-column masonry layout
  - Split items into left/right columns manually
  - Use two `View` columns inside a `ScrollView`
- **Events tab**: Keep FlatList, update card styling
- **Fun tab**: Link to Vibes features or show inline

#### [MODIFY] [wall-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/memories/wall-card.tsx)
- Multiple visual variants based on memory type:
  - **Quote**: Yellow bg, large ❝ mark, centered text, author badge, emoji in top-right corner
  - **Inside joke**: Light bg, "inside joke" label pill, italic text
  - **Photo**: Full image, caption overlay at bottom, date + "4 of us" metadata
  - **Milestone**: Colored bg (green/purple), emoji, date, "🏆 Milestone" badge

#### [MODIFY] [event-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/memories/event-card.tsx)
- Cover photo hero, title overlay, date range, participant count

#### [MODIFY] [memories/[memoryId].tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/memories/[memoryId].tsx)
- **Wall detail**: `ScreenHeader` "Memory 💛", large card, @author + time, `DashedSeparator`, `EmojiReactionStrip`, "7 comments 💬", `CommentSection`
- **Event scrapbook detail**: Hero cover photo, "EVENT SCRAPBOOK" label, title, meta card (participants, date, location), reactions, `SegmentedControl` filled variant (Reflections/Photos/Links), reflection cards, FAB

#### [MODIFY] [memories/new.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/memories/new.tsx)
- Apply ScreenHeader + form card styling

---

### 2E — Vibes Tab

#### [MODIFY] [vibes/index.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/squad/[id]/vibes/index.tsx)
- `ScreenHeader`: "Vibes ✨"
- Apply new card styling to all sections (Daily Vibes, Weekly Question, Polls, Confessions)
- Section headers: uppercase label + "+" new button

#### [MODIFY] All vibes sub-components — apply new design tokens:
- [daily-vibes-row.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/daily-vibes-row.tsx) — avatar circles with vibe emoji
- [weekly-question-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/weekly-question-card.tsx) — warm card, yellow accent
- [poll-card.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/poll-card.tsx) — progress bars, new card style
- [confession-feed.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/confession-feed.tsx) — white cards with reactions
- [confession-input.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/confession-input.tsx) — rounded input, yellow send
- [create-poll.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/create-poll.tsx) — form cards
- [vibe-picker.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/components/vibes/vibe-picker.tsx) — bottom sheet, emoji grid

---

## Phase 3 — Deferred (Auth, Onboarding, Squad Selection)
**Do these AFTER the 5 tabs look polished.**

- [sign-in.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(public)/sign-in.tsx) — New layout with app logo, squad code input, Join CTA, Google OAuth button, email OTP flow
- [set-username.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(public)/set-username.tsx) — Progress dots, emoji avatar picker, vibe selection
- [index.tsx (auth)](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/index.tsx) — Squad picker cards with emoji icons, hero banner
- [create-squad.tsx](file:///home/divyanshu-18871/Developer/sandbox/hobby/homie-squad/src/app/(auth)/create-squad.tsx) — Photo/emoji picker, invite link, form cards

---

## File Count Summary

| Phase | Files Modified | Files Created | Effort Estimate |
|---|---|---|---|
| Phase 0 — Tokens | 5 | 0 | 30 min |
| Phase 1 — Shared Components | 2 | 5 | 1-2 hours |
| Phase 2A — Chat | 7 | 0 | 1-2 hours |
| Phase 2B — Drops | 5 | 0 | 1-2 hours |
| Phase 2C — Notes | 7 | 0 | 1-2 hours |
| Phase 2D — Memories | 5 | 0 | 2-3 hours |
| Phase 2E — Vibes | 8 | 0 | 1-2 hours |
| Phase 3 — Deferred | 4 | 0 | 2-3 hours |
| **Total** | **~43** | **~5** | **~10-16 hours** |

---

## Verification Plan

### After Each Phase
1. `npx tsc --noEmit` — catch type errors
2. `npx expo start` — visual check on device/simulator
3. Navigate to every screen in the affected tab
4. Verify touch targets ≥ 44px, text readable on cream bg

### Final Checklist
- [ ] All 5 tabs use ScreenHeader consistently
- [ ] All cards: white, 2px border, 16px radius, dashed separators
- [ ] Accent color is golden yellow throughout (no indigo remnants)
- [ ] Background is warm cream throughout (no cool grey remnants)
- [ ] Tab bar: cream bg, black active icons, grey inactive
- [ ] FAB: yellow, black border and icon
- [ ] All buttons: rounded, bordered, correct variant
- [ ] Emoji reactions use new strip component
- [ ] Comment sections use shared component

---

## Learning Guidance

| Phase | What You'll Learn |
|---|---|
| 0 — Tokens | How RN style propagation works, `useTheme()` pattern, iOS shadow vs Android elevation |
| 1 — Components | Props/variants pattern, `StyleSheet.create()`, composable component design |
| 2A — Chat | FlatList inverted, keyboard handling, real-time UI updates, Pressable states |
| 2B — Drops | Pagination, filtering state, category-based rendering |
| 2C — Notes | Rich text patterns, auto-save, toolbar components |
| 2D — Memories | Manual masonry layout, image rendering, complex card variants |
| 2E — Vibes | Bottom sheets, emoji pickers, poll state management |

> [!TIP]
> **The golden rule of RN styling**: Never hardcode colors or sizes. Always use tokens from `theme.ts`. If you find yourself typing `'#F5C542'` in a component file, stop and add it as a token instead.
