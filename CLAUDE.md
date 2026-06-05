# FormIQ — Agent Reference

> **LIVING DOCUMENT:** Update this file when project structure, tech stack, architectural patterns, or product decisions change.

---

## ⚠️ PRODUCTION BLOCKERS

1. **Paywall bypassed** — `app/_layout.tsx` line 13 hardcodes `const isSubscribed = true`. MUST revert before App Store release: remove that line and change `isSubscribed: _isSubscribed` back to `isSubscribed`.
2. **Apple + Google sign-in are stubs** — `src/supabase/auth.ts` throws for both. Email/password only works in Phase 1.
3. **Dev Access button** — `app/(auth)/login.tsx` renders a "Dev Access (testing only)" button when `__DEV__` is true. It bypasses Supabase auth by injecting a fake user into userStore. MUST verify this button is absent in the production/release build before App Store submission.

---

## Commands

```bash
npx expo start
npx expo run:ios        # physical device required — camera + ML don't run in simulator
npm install --legacy-peer-deps   # ALWAYS use this flag — supabase pulls in react-dom causing peer conflicts
```

## Environment Variables

Create `.env.local` at project root (loaded by `app.config.js`):

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
REVENUECAT_IOS_API_KEY=
```

## Structure

```
app/
  _layout.tsx               Auth guard: no user → login, no sub → paywall, else → tabs
  (auth)/login.tsx           Sign in (Apple stub / Google stub / email+password)
  (auth)/paywall.tsx         RevenueCat hard wall
  (tabs)/index.tsx           Home dashboard
  (tabs)/history.tsx         Session list (empty state for now)
  record/select.tsx          Exercise picker
  record/position.tsx        Camera angle guard (keypoint confidence check)
  record/[exercise].tsx      Live recording screen
  session/[id].tsx           Playback + AI feedback

src/
  camera/                    useCamera.ts, usePoseFrameProcessor.ts
  pose/                      PoseEngine.ts, PoseTypes.ts, KeypointSmoother.ts, PoseMath.ts
  analysis/                  RepCounter.ts, FormAnalyzer.ts, PerformanceRater.ts, ExerciseRegistry.ts
  analysis/exercises/        squat.ts (reference impl — Phase 2 adds the rest)
  ai/                        ClaudeClient.ts, PromptBuilder.ts
  overlay/                   SkeletonCanvas.tsx, skeletonConnections.ts, usePlaybackSync.ts
  storage/                   db.ts, SessionRepository.ts, PoseFrameRepository.ts
  supabase/                  client.ts, auth.ts, SessionSync.ts
  subscription/              RevenueCatClient.ts, useSubscription.ts
  store/                     recordingStore.ts, userStore.ts
  components/FormBadge/      Green (≥0.8) / Orange (≥0.5) / Red (<0.5) form indicator
  stubs/web-only.js          Metro stub for web-only TF.js backends
```

## VisionCamera v5 Traps

- **`frame.dispose()` must be called in every `onFrame` branch** — omitting it stalls the camera pipeline permanently
- **`recorder` is single-use per session** — create a new one for each recording; reusing fails silently
- **TF.js is not worklet-safe** — use `runOnJS` from `react-native-reanimated` to bridge worklet → JS thread

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native + Expo bare workflow |
| Navigation | Expo Router (file-based) |
| Camera | `react-native-vision-camera` v5 (output-based: `useFrameOutput` / `useVideoOutput`) |
| Pose detection | `@tensorflow/tfjs-react-native` + MoveNet Lightning |
| AI coaching | `@anthropic-ai/sdk` — `claude-sonnet-4-6` |
| Skeleton overlay | `react-native-svg` |
| State | `zustand` |
| Local storage | `expo-sqlite` + `msgpack-lite` for pose blobs |
| Cloud backend | Supabase (Auth + Postgres) |
| Subscriptions | `react-native-purchases` (RevenueCat, entitlement: `pro`) |
| Video playback | `expo-video` |

## Product Decisions

| Topic | Decision |
|---|---|
| App name | TBD — form/technique themed (FormIQ is placeholder) |
| Auth | Required — Apple + Google + email/password (Supabase) |
| Data | Videos local-only; session metadata syncs to Supabase |
| Platform | iOS first |
| AI tone | Clinical/technical — cites specific angles and measurements |
| Camera guard | Block until keypoint confidence ≥ 0.5 for 10 consecutive frames |
| Exercise library | 20–30 exercises at launch; MVP is squats only |

## Supabase Schema

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  exercise text not null,
  recorded_at timestamptz not null,
  video_local_path text,
  rep_count int,
  partial_rep_count int,
  form_score real,
  rating_score real,
  claude_feedback text,
  duration_ms int
);

create table rep_events (
  id bigserial primary key,
  session_id uuid references sessions not null,
  rep_index int not null,
  start_timestamp_ms int,
  end_timestamp_ms int,
  form_score real,
  is_full_rep boolean,
  issues jsonb
);

alter table sessions enable row level security;
create policy "users own sessions" on sessions using (auth.uid() = user_id);
```

## Phase Status

| Phase | Focus | Status |
|---|---|---|
| 0 | Foundation — project setup, all source files, TypeScript clean | **Complete** |
| 1 | Squats MVP — frame processor wired to TF.js, end-to-end record→feedback | **In progress** |
| 2 | Exercise expansion — all 20–30 ExerciseConfig implementations | Not started |
| 3 | Polish — animations, onboarding, offline model bundle | Not started |
| 4 | Advanced — BlazePose, Apple Health, progress tracking | Not started |

**Current phase: 1** — Run `npx expo run:ios` on a physical device and verify TF.js inference fires (watch for `[Video]` error logs and rep counter incrementing).
