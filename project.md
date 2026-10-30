

### Product Direction

Clique is a private group app for close-knit friend groups ("squads"). Each squad gets a shared space with chat, recommendation drops, collective memories, notes/journals, and social vibes (polls, confessions, weekly questions). A blend between Discord, a shared journal, and a scrapbook — designed for small, real-life friend groups, not public communities.

The neo-brutalist visual language (hard shadows, warm cream #F5F0E8, golden accent #F5C542) gives it a distinct, playful personality. The password-based squad join is intentionally low-friction.

### What's Already Strong (Preserve)

- **Design system** — Consistent neo-brutalist tokens in `src/constants/theme.ts`, 4pt spacing grid, well-defined color palette. Most components use theme tokens properly.
- **Notes feature** — The most polished feature. Multi-type notes (personal/shared/friend/journal), auto-save with 500ms debounce, collaborator avatar stacks, markdown toolbar, search, and segmented feed. This is the quality bar.
- **Chat channel system** — Sophisticated 5-type channels (main/topic/mood/thread/ephemeral) with proper expiry + grace periods, unread tracking, and typing indicators. The ephemeral countdown UI is a standout detail.
- **Drops voting** — Optimistic updates via `use-vote-mutation.ts`, category filtering, and a complete reaction system. Feels snappy.
- **Schema design** — 30+ tables with proper compound indexes, good separation of concerns, and extensible category system on drops.

### Critical Gaps (Broken/Disconnected Features)

| Issue | Location | What's Wrong |
|-------|----------|-------------|
| Image upload disconnected | `src/hooks/use-image-upload.ts` exists, schema supports `type: "image"`, but `message-input.tsx` attachment button is a no-op placeholder | Can't send photos in chat |
| Image viewer unused | `src/components/image-viewer.tsx` exists but never imported | Dead code |
| Comment inputs are fake | `src/components/ui/comment-section.tsx` renders an input but drop detail and memory detail screens have non-functional comment submission | Users type comments that vanish |
| Emoji picker missing | Drop reactions "+", message reactions — all placeholder buttons with no emoji picker behind them | Can't add custom reactions |
| Dark mode claimed but absent | `use-theme.ts` always returns `Colors.light`, `theme.ts` dark palette is identical to light | Feature listed but doesn't exist |
| app-tabs.tsx says "Expo Starter" | `src/components/app-tabs.tsx:59` hardcoded brand text | Not your app name |
| DailyVibesRow unused | `src/components/vibes/daily-vibes-row.tsx` exists but never rendered | Dead component |
| Message reactions component unused | `src/components/chat/message-reactions.tsx` exists but message-item uses `emoji-reaction-strip` instead | Duplicate/conflicting implementations |

### Incomplete Flows

- No edit functionality for drops, memories, or memory items — only create and delete
- No message search — completely absent across the entire chat system
- No read receipts — `channelReadStatus` table exists but no visual "read by X, Y" indicators
- No online/presence indicators — `presence.ts` tracks online status but not surfaced in chat UI or member lists
- No message threading UI — `parentMessageId` field exists in schema but no threaded reply view
- No squad editing — can't rename squad, change password, or manage members after creation
- No member list/profile screen — no way to see who's in a squad or view another member's profile

### UI/UX Issues

**Consistency Problems:**
1. Button component bypasses theme — `src/components/button.tsx` uses `Colors.light.accent` directly instead of `useTheme()` tokens
2. Hardcoded colors scattered — `filter-chips.tsx:65` (`#FFFFFF`), `user-avatar.tsx:5` (COLORS array), `user-avatar.tsx:61` (`#e5e5e5`) — should all use theme tokens
3. Missing exports — `src/components/ui/index.ts` doesn't export `DashedSeparator`, `FilterChips`, `EmojiReactionStrip`, `CommentSection`, or `Collapsible`
4. Hardcoded deep link — `sign-in.tsx:58` uses `clique://` instead of reading from `app.json` config
5. Hardcoded sender email — `convex/ResendOTP.ts:23` uses `onboarding@resend.dev` (Resend test domain)

**Missing UX Patterns:**
- No loading skeletons — screens jump from spinner to content
- No toast/snackbar system — success/failure actions have no feedback. Joining a squad fails silently
- No confirmation dialogs — deleting notes, drops, leaving squads — no "are you sure?" prompt
- No empty states with CTAs — fresh squad shows blank screens instead of helpful prompts
- No error boundaries — a single component crash takes down the entire screen
- No resend OTP — if the code doesn't arrive, user is stuck on the verification screen

**Accessibility:**
- Missing `accessibilityLabel` on most interactive elements
- No screen reader support for dynamic content
- Touch targets on some chips and small buttons are below the 44pt minimum

### Backend & Security Concerns

**Authorization Issues:**
1. `getSquad` query has no auth check — anyone can view any squad by ID
2. Inconsistent auth patterns — some functions use `getAuthUserId()`, others use `ctx.auth.getUserIdentity()` directly
3. Missing membership validation — `updatePresence` and `setTyping` don't verify the user belongs to the squad ==> IS IT NECESSARY?
4. No input length limits — message, confession, note content have no max length validation

**Data Integrity:**
- No cascade deletes — deleting a squad leaves orphaned channels, messages, reactions, notes, memories, drops, polls, confessions
- No cascade on channel delete — leaves orphaned messages, typing indicators, read statuses
- No cascade on user removal — their messages, notes, reactions remain with dangling user references

**Performance:**
- N+1 in reaction fetching (`convex/message.ts`) — uses `.filter().or()` across message IDs instead of compound index
- Client-side search in notes — filters server results client-side; should be a server query with pagination
- No pagination on some feeds — memories and vibes load all items at once

### Missing Essential Features

1. Member management — view members, see online status, remove members, transfer ownership
2. Push notifications — no notification system for new messages, mentions, or activity
3. User profiles — no profile screen, no avatar customization beyond auto-generated Dicebear
4. Image messaging — infrastructure exists, just needs wiring
5. Message edit indicator — `editedAt` is saved but no "edited" label shown in UI
6. Search — across messages, notes, and drops

### Recommended Priority Path

**Phase 1 — Fix What's Broken (before adding features):**
1. Wire up image upload in chat message input
2. Make comment inputs functional (drops + memories)
3. Add basic error handling + toast feedback
4. Unify auth patterns in backend
5. Add input validation (length limits) on all mutations
6. Replace "Expo Starter" text with "Clique"
7. Remove dead components or wire them up

**Phase 2 — Core UX Polish:**
1. Add empty states with CTAs for fresh squads
2. Add loading skeletons for all list screens
3. Add confirmation dialogs for destructive actions
4. Fix Button component to use theme tokens
5. Add resend OTP on sign-in screen
6. Add message "edited" indicator
7. Surface online/presence status in chat header

**Phase 3 — Essential Missing Features:**
1. Member list + profiles
2. Squad settings (rename, change password)
3. Message search
4. Push notifications
5. Read receipts

**Phase 4 — New Features:**
- **E2EE Direct Messages** — Private 1-on-1 messaging between users, NOT tied to squads. NaCl box encryption (tweetnacl); server stores only ciphertext. Multi-device fan-out (up to 5 devices). Local SQLite for decrypted messages. See `tasks/e2ee.dm-feature.html` for full spec.
- Threaded replies in chat
- Rich text editor for notes
- Memory timeline view
- Dark mode (actually implement it)
- Drop bookmarks/collections
- WebRTC video/voice calls (see implementation plan below)

---

## WebRTC Video/Voice Call — Learning Path & Implementation Plan

### Concepts to Learn

1. **WebRTC Fundamentals**
   - What WebRTC is: a browser/mobile API for peer-to-peer real-time audio/video
   - Key objects: `RTCPeerConnection`, `MediaStream`, `RTCDataChannel`
   - The signaling problem: WebRTC peers need to exchange connection info (SDP offers/answers + ICE candidates) through a separate channel — this is your signaling server
   - ICE, STUN, and TURN: how peers discover each other and handle NAT traversal. STUN servers help peers find their public IP; TURN servers relay traffic when direct P2P fails (needed for ~10-20% of connections behind strict NATs)

2. **Signaling**
   - You don't need a dedicated signaling server — Convex can serve this role
   - Flow: Caller creates an SDP offer → writes to Convex → Callee reads it → creates SDP answer → writes back → both exchange ICE candidates through Convex mutations/queries
   - This is the architecture you'll use — no additional server needed

3. **React Native WebRTC**
   - The `react-native-webrtc` library provides the native WebRTC implementation for iOS/Android
   - It mirrors the browser WebRTC API but with React Native event emitters
   - For Expo, you'll need a dev client (not Expo Go) since this requires native modules

4. **Mobile-Specific Concerns**
   - Foreground service for keeping calls alive when app is backgrounded
   - Audio session management (handling interruptions, mixing with other audio)
   - Permission handling for camera and microphone
   - CallKit (iOS) / ConnectionService (Android) for system-level call UI

### Tech Stack for Calls

```
react-native-webrtc     — Native WebRTC (media capture, peer connection)
Convex mutations/queries — Signaling (offer/answer/ICE candidate exchange)
@livekit/react-native   — OPTIONAL: higher-level SDK if you want managed infrastructure later
expo-camera / expo-av   — May conflict with react-native-webrtc; test compatibility
```

### Architecture

```
┌─────────────┐     Signaling      ┌─────────────┐
│   Caller    │ ◄──(Convex DB)──► │   Callee    │
│  (App)      │                    │  (App)      │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │         P2P Media Stream         │
       │ ◄──────────────────────────────► │
       │    (via STUN/TURN servers)       │
```

### Stepwise Implementation Plan

**Step 1: Dev Client Setup (prerequisite)**
- Create an Expo dev client (you already have `expo-dev-client` in deps)
- `npx expo install react-native-webrtc`
- Build dev client: `eas build --profile development`
- Test that the app runs on your device with the custom dev client

**Step 2: Convex Signaling Schema**
- Add tables: `callSignals` (offer/answer/ICE candidates), `activeCalls` (track ongoing calls)
- Design: caller writes offer → callee subscribes → writes answer → both stream ICE candidates
- Key decision: use a single `callSignals` table with typed entries, or separate tables per signal type

**Step 3: Signaling Layer (Convex)**
- Mutations: `createCall`, `sendOffer`, `sendAnswer`, `sendIceCandidate`, `endCall`
- Queries: `getCallSignals` (subscribe to signals for a call), `getActiveCall`
- Cleanup: cron to delete stale calls after timeout (no answer within 30s)

**Step 4: WebRTC Manager (Frontend)**
- Create a `src/services/webrtc.ts` service that wraps `RTCPeerConnection`
- Handles: create offer, create answer, add ICE candidates, manage media streams
- ICE servers: start with free Google STUN servers (`stun:stun.l.google.com:19302`), add TURN later if needed
- React to connection state changes (connected, disconnected, failed)

**Step 5: Call Initiation Flow**
- UI: add a call button (voice + video) in squad header or chat header
- On tap: request mic/camera permissions → create RTCPeerConnection → get local media stream → create offer → write to Convex
- Navigate to a `CallScreen` with local video preview

**Step 6: Call Receiving Flow**
- Subscription on `activeCalls` for the user's squad
- When a call appears: show incoming call UI (ringing screen with accept/decline)
- On accept: create RTCPeerConnection → get local media → create answer → write to Convex
- On decline: mutate call status to "declined"

**Step 7: Call Screen UI**
- Full-screen video layout: remote video fills background, local video as a draggable PIP
- Controls: mute, camera toggle, switch camera (front/back), end call
- Audio-only mode: show avatars instead of video
- Speaker toggle

**Step 8: Multi-Party Calls (Future)**
- 1-on-1 uses direct P2P (what you build in steps 1-7)
- Multi-party (3+ people) requires an SFU (Selective Forwarding Unit) — this is where LiveKit or a hosted service becomes necessary
- Recommendation: ship 1-on-1 first, evaluate LiveKit for group calls later

**Step 9: System Integration**
- iOS: CallKit integration so calls appear in the system phone UI and work when app is backgrounded
- Android: ConnectionService for the same
- These are advanced — defer until 1-on-1 calling works in foreground

**Step 10: Polish**
- Call quality indicators (connection strength)
- Reconnection on network change
- Call history / missed calls log
- Ringtone / vibration feedback

### Recommended Learning Order

1. Read the WebRTC chapter from "High Performance Browser Networking" (free online): https://hpbn.co/webrtc/
2. Study the `react-native-webrtc` example app: https://github.com/react-native-webrtc/react-native-webrtc/tree/master/Example
3. Build a minimal 1-on-1 call prototype (steps 2-7 above) before touching multi-party
4. Once P2P works reliably, decide if you need TURN servers (test across different networks first)
5. Only then consider CallKit/ConnectionService and multi-party


