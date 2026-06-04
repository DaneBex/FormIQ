# FormIQ

iOS app that tracks exercise form in real time using your phone camera. Records sets, counts reps, scores form, overlays a skeleton on live camera and video playback, and delivers AI coaching after each set.

**Platform: iOS only.** A physical device is required — the camera and on-device ML do not run in the iOS Simulator.

---

## Prerequisites

Before you start, make sure you have the following installed:

| Tool | Version | Notes |
|---|---|---|
| macOS | 13+ | Required for iOS builds |
| Node.js | 18+ | |
| npm | 9+ | |
| Xcode | 15+ | Install from the Mac App Store |
| Xcode Command Line Tools | latest | `xcode-select --install` |
| CocoaPods | 1.14+ | `sudo gem install cocoapods` |
| Ruby | 3.1+ | CocoaPods requires a recent Ruby |

Check Xcode is fully set up and you have accepted the license:

```bash
sudo xcodebuild -license accept
```

---

## External Services

You need accounts and API keys for three services before the app will run.

### 1. Anthropic (AI coaching)

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Keep it for the `.env.local` file below

### 2. Supabase (auth + session data)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and note your **Project URL** and **anon public key**
3. Go to the **SQL Editor** and run the following migrations to create the database schema:

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

4. Go to **Authentication → Providers** and enable the sign-in methods you want (Email is on by default; Apple and Google require additional setup)

### 3. RevenueCat (subscription paywall)

1. Create a free account at [revenuecat.com](https://www.revenuecat.com)
2. Create a new app and add your iOS app (bundle ID: `com.formiq.app`)
3. Create an entitlement named exactly `pro` and attach a product to it
4. Go to **API Keys** and copy your **iOS public SDK key**

> Note: For local development you can bypass the paywall entirely — see the [Dev Shortcuts](#dev-shortcuts) section below.

---

## Installation

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd salesforce-check
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required. `@supabase/supabase-js` pulls in `react-dom` which causes peer dependency conflicts without it.

### 2. Create environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and add your keys:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
REVENUECAT_IOS_API_KEY=appl_...
```

Expo CLI automatically loads `.env.local` before the build. The included `app.config.js` passes these values into the app via `Constants.expoConfig.extra`. Never commit `.env.local` — it is gitignored.

### 3. Install iOS native dependencies

```bash
cd ios
pod install
cd ..
```

If CocoaPods fails, try:

```bash
cd ios
bundle exec pod install
cd ..
```

---

## Running the App

Connect a physical iOS device via USB, trust the computer on the device if prompted, then:

```bash
npx expo run:ios
```

This builds the native binary, installs it on your device, and starts the JS bundler. The first build takes several minutes. Subsequent builds are faster.

> Do not use `npx expo start` — that launches Expo Go which cannot run native modules (camera, TF.js frame processors, RevenueCat).

### Selecting a specific device

```bash
npx expo run:ios --device
```

This shows a picker if multiple devices or simulators are connected.

### Development build (team signing)

If Xcode rejects the build due to signing, open the workspace and set your team:

```bash
open ios/salesforcecheck.xcworkspace
```

In Xcode: select the `salesforcecheck` target → **Signing & Capabilities** → set your Apple developer team.

---

## Dev Shortcuts

When running in development mode (`__DEV__ === true`), several friction-reducing shortcuts are active:

- **Camera position screen**: a "DEV: Skip position check" button appears that bypasses the 10-frame confidence requirement and lets you go straight to recording.

---

## Architecture Overview

```
app/                    Expo Router screens
  (auth)/               Login + paywall (require account + subscription)
  (tabs)/               Home dashboard + session history
  record/               Exercise picker → position guard → live recording
  session/[id].tsx      Playback with skeleton overlay + AI feedback

src/
  camera/               VisionCamera v5 frame output hook (→ TF.js bridge)
  pose/                 TF.js MoveNet Lightning inference + EMA smoothing
  analysis/             Rep counter state machine + form checks per exercise
  ai/                   Claude API coaching prompt builder + client
  overlay/              SVG skeleton canvas (live + playback)
  storage/              SQLite session/rep storage + msgpack pose frame blobs
  supabase/             Auth + session sync
  subscription/         RevenueCat entitlement check
  store/                Zustand state (recording, playback, user)
```

The full architectural details, patterns, and phase status are documented in [CLAUDE.md](CLAUDE.md).

---

## How a Session Works

1. User picks an exercise → position guard screen checks all required keypoints are visible at ≥0.5 confidence for 10 consecutive frames
2. Live recording screen starts simultaneously: VisionCamera streams RGB frames → TF.js MoveNet infers a pose → rep counter and form analyzer update in real time
3. Video is recorded alongside inference via VisionCamera's `useVideoOutput`
4. When the user taps "Stop Set", the video file path, all pose frames (msgpack-encoded), rep events, and AI coaching feedback (from Claude) are saved locally via SQLite
5. Session screen plays back the video with the skeleton overlaid, synced to the recorded pose frames

---

## Troubleshooting

**`pod install` fails with Ruby errors**
Make sure you are using Ruby 3.1+. If you are using rbenv or rvm, check your active version: `ruby --version`.

**Build fails with signing errors**
Open `ios/salesforcecheck.xcworkspace` in Xcode and set a development team under Signing & Capabilities.

**Camera shows black screen on device**
Check that camera permission is granted: Settings → FormIQ → Camera.

**Rep counter never increments**
The pose engine must finish loading before inference starts. Watch the console for TF.js initialisation logs. If you see `[Video]` error logs, the recorder failed to start — check that microphone permission is granted.

**`npm install` fails with peer dependency errors**
Always use `npm install --legacy-peer-deps`. Do not omit this flag.

**Supabase auth not working**
Confirm your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct and that Row Level Security is enabled on the `sessions` table with the policy shown in the schema above.
