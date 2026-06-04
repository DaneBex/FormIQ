# FormIQ — Agent Reference

> **LIVING DOCUMENT:** This file must be updated whenever the project structure, tech stack, architectural patterns, or product decisions change. Every agent working on this project is required to update this file before ending their session if anything here has changed.

---

## What This App Does

iOS-first React Native app. Phone camera + on-device AI tracks exercise form in real time. Counts reps, scores form, overlays a skeleton on live camera and video playback, delivers clinical AI coaching after each set via Claude API. Requires an account and active subscription to use anything.

## Product Decisions

| Topic | Decision |
|---|---|
| App name | TBD — form/technique themed (FormIQ is placeholder) |
| Auth | Required — Apple + Google + Email/password (Supabase) |
| Paywall | Hard wall immediately after login (RevenueCat, entitlement: `pro`) |
| Data | Videos local-only; session metadata syncs to Supabase |
| Platform | iOS first |
| Live feedback | Form badge (green/yellow/red) + audio cue per rep |
| AI tone | Clinical/technical — cites specific angles and measurements |
| Camera guard | Block recording until keypoint confidence ≥ 0.5 for 10 consecutive frames |
| Exercise library | 20–30 exercises at launch; MVP is squats only |

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
| Subscriptions | `react-native-purchases` (RevenueCat) |
| Video playback | `expo-video` |

## Running the App

```bash
npx expo start
npx expo run:ios   # requires physical device for camera/ML frame processors
```

## Environment Variables

Create `.env.local` at project root:

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
REVENUECAT_IOS_API_KEY=
```

## Project Structure

```
app/
  _layout.tsx               Auth guard: no user → login, no sub → paywall, else → tabs
  (auth)/login.tsx           Sign in (Apple / Google / email)
  (auth)/paywall.tsx         RevenueCat hard wall
  (tabs)/index.tsx           Home dashboard
  (tabs)/history.tsx         Session list
  record/select.tsx          Exercise picker
  record/position.tsx        Camera angle guard (keypoint confidence check)
  record/[exercise].tsx      Live recording screen
  session/[id].tsx           Playback + AI feedback

src/
  camera/
    useCamera.ts             useCameraDevice + permission hook
  pose/
    PoseEngine.ts            TF.js MoveNet model load + per-frame inference
    PoseTypes.ts             KeypointName enum (17), PoseFrame, Keypoint interfaces
    KeypointSmoother.ts      EMA filter (ALPHA=0.35) to reduce jitter
    PoseMath.ts              angleBetweenThreePoints, distanceBetween, angleFromVertical
  analysis/
    RepCounter.ts            State machine: IDLE→DESCENDING→BOTTOM→ASCENDING→TOP
    FormAnalyzer.ts          Runs FormCheck[] per frame; emits RepFormSummary per rep
    PerformanceRater.ts      Aggregates form scores → { score/10, grade, fullRepRate }
    ExerciseRegistry.ts      getExerciseConfig(id), getAllExercises()
    exercises/
      squat.ts               REFERENCE IMPLEMENTATION — all exercises follow this pattern
      deadlift.ts
      benchPress.ts
      overheadPress.ts
      pushUp.ts
      pullUp.ts
      lunge.ts
  ai/
    ClaudeClient.ts          getCoachingFeedback(prompt) — one call per set
    PromptBuilder.ts         buildCoachingPrompt() — clinical prompt from RepFormSummary[]
  overlay/
    SkeletonCanvas.tsx       SVG skeleton overlay — used for BOTH live camera and playback
    skeletonConnections.ts   16 [KeypointA, KeypointB] pairs + color mapping
    usePlaybackSync.ts       Binary search PoseFrame[] on video currentTime
  storage/
    db.ts                    SQLite schema + migration runner (formiq.db)
    SessionRepository.ts     saveSession, saveRepEvents, getSession, getSessions
    PoseFrameRepository.ts   savePoseFrames / loadPoseFrames — single msgpack blob per session
  supabase/
    client.ts                createClient() singleton
    auth.ts                  signInWithApple, signInWithGoogle, signInWithEmail, signOut
    SessionSync.ts           syncSession(session, userId) — upserts metadata to Supabase
  subscription/
    RevenueCatClient.ts      configureRevenueCat, checkEntitlement, purchaseSubscription
    useSubscription.ts       { isSubscribed, loading, refresh }
  store/
    recordingStore.ts        Live session state: keypoints, repCount, formScore, poseFrames[]
    playbackStore.ts         Playback state: skeleton toggle, current frame index
    userStore.ts             AppUser, setUser, clearUser
  components/
    FormBadge/               Green (≥0.8) / Orange (≥0.5) / Red (<0.5) form indicator
```

## Key Architectural Patterns

### ExerciseConfig (squat.ts is the reference — all exercises follow this exactly)

```typescript
interface ExerciseConfig {
  id: string
  name: string
  cameraAngle: 'side' | 'front' | 'either'
  requiredKeypoints: KeypointName[]
  primaryMetric: (frame: PoseFrame) => number
  stateThresholds: {
    descentStart: number    // metric crosses this going down → DESCENDING
    fullRepTarget: number   // must reach this → BOTTOM (counts as full rep)
    ascentEnd: number       // metric crosses this going up → TOP
  }
  formChecks: FormCheck[]
}
```

### Rep state machine

```
IDLE → DESCENDING → BOTTOM → ASCENDING → TOP → (repeat)
DESCENDING → PARTIAL_ASCENDING → TOP  (if reversal before fullRepTarget)
```

TOP entry fires `RepEvent { repIndex, isFullRep, startTimestamp, endTimestamp }` → FormAnalyzer.

### Pose data storage

`PoseFrame[]` msgpack-encoded as a **single blob** in SQLite per session. One write when recording stops, one read when playback opens. Avoids per-frame row writes during recording.

### Skeleton coordinate transform

MoveNet returns [0, 1] normalized coords. `normalizedToDisplay(kp, frameWidth, frameHeight, displayRect)` in `SkeletonCanvas.tsx` converts to display pixels accounting for aspect ratio and letterboxing. Used identically for live camera and playback.

### VisionCamera v5 frame processing

v5 replaced JSI frame processors with an output-based model. Every output is passed via `<Camera outputs={[...]} />`.

```typescript
// src/camera/usePoseFrameProcessor.ts — bridge worklet onFrame → TF.js JS thread
const frameOutput = useFrameOutput({
  pixelFormat: 'rgb',
  enablePreviewSizedOutputBuffers: true, // smaller buffers, sufficient for MoveNet
  onFrame: (frame) => {
    'worklet'
    if (!frame.hasPixelBuffer) { frame.dispose(); return }
    const buffer = frame.getPixelBuffer()
    const { width, height, timestamp } = frame
    frame.dispose()                       // required — releases frame back to pipeline
    runOnJS(handleFrameOnJS)(buffer, width, height, timestamp)
  }
})
// handleFrameOnJS: isProcessingRef throttle → detectPoseFromBuffer → onPose callback

// Video recording (single-use Recorder per session):
const videoOutput = useVideoOutput({})
const recorder = await videoOutput.createRecorder({})
await recorder.startRecording(onFinished, onError)
await recorder.stopRecording()  // triggers onFinished(filePath)

// Wire both into camera:
<Camera outputs={[frameOutput, videoOutput]} isActive={cameraActive} />
```

Key constraints:
- `runOnJS` from `react-native-reanimated` bridges worklet → JS thread (TF.js is not worklet-safe)
- `frame.dispose()` must be called in every `onFrame` path — omitting it stalls the camera pipeline
- `isProcessingRef` prevents queuing TF.js calls while inference is in flight (~10fps effective)
- `recorder` is single-use per session — create a new one for each recording

### npm installs

Always use `--legacy-peer-deps` — `@supabase/supabase-js` pulls in react-dom which causes peer dep conflicts otherwise.

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

**Current phase: 1** — frame output and video recording are wired. Next action: run `npx expo run:ios` on a physical device and verify TF.js inference fires (watch for `[Video]` error logs and rep counter incrementing).
