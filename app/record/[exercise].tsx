import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, useCameraDevice, useVideoOutput } from 'react-native-vision-camera';
import type { Recorder } from 'react-native-vision-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';

import { SkeletonCanvas } from '@/overlay/SkeletonCanvas';
import { useRecordingStore } from '@/store/recordingStore';
import { getExerciseConfig } from '@/analysis/ExerciseRegistry';
import { initPoseEngine } from '@/pose/PoseEngine';
import { RepCounter } from '@/analysis/RepCounter';
import { FormAnalyzer } from '@/analysis/FormAnalyzer';
import { savePoseFrames } from '@/storage/PoseFrameRepository';
import { saveSession, saveRepEvents } from '@/storage/SessionRepository';
import { ratePerformance } from '@/analysis/PerformanceRater';
import { buildCoachingPrompt } from '@/ai/PromptBuilder';
import { getCoachingFeedback } from '@/ai/ClaudeClient';
import { FormBadge } from '@/components/FormBadge/FormBadge';
import { usePoseFrameProcessor } from '@/camera/usePoseFrameProcessor';
import type { PoseFrame } from '@/pose/PoseTypes';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function LiveRecordingScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const router = useRouter();
  const device = useCameraDevice('back');
  const config = getExerciseConfig(exercise ?? '');

  const store = useRecordingStore();
  const repCounterRef = useRef<RepCounter | null>(null);
  const formAnalyzerRef = useRef<FormAnalyzer | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const recorderRef = useRef<Recorder | null>(null);
  const onVideoFinishedRef = useRef<((path: string | null) => void) | null>(null);
  const frameDimsRef = useRef({ width: 1080, height: 1920 });

  const videoOutput = useVideoOutput({});

  useEffect(() => {
    if (!config) return;
    initPoseEngine().catch((err) => {
      console.error('[PoseEngine] Failed to initialize:', err);
    });
    const sessionId = Crypto.randomUUID();
    repCounterRef.current = new RepCounter(config.stateThresholds);
    formAnalyzerRef.current = new FormAnalyzer(config);

    repCounterRef.current.onRep((event) => {
      store.incrementRep(event.isFullRep);
      const summary = formAnalyzerRef.current!.collectRep(event);
      store.addRepSummary(summary);
      store.setFormScore(summary.score);
    });

    store.startRecording(exercise!, sessionId);

    videoOutput.createRecorder({}).then((recorder) => {
      recorderRef.current = recorder;
      recorder.startRecording(
        (filePath) => {
          onVideoFinishedRef.current?.(filePath);
          onVideoFinishedRef.current = null;
        },
        (error) => {
          console.error('[Video]', error);
          onVideoFinishedRef.current?.(null);
          onVideoFinishedRef.current = null;
        },
      );
    });

    return () => {
      recorderRef.current?.stopRecording().catch(() => {});
      recorderRef.current = null;
      setCameraActive(false);
      store.reset();
      repCounterRef.current = null;
      formAnalyzerRef.current = null;
    };
  }, [exercise]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPose = useCallback((pose: PoseFrame) => {
    if (!repCounterRef.current || !formAnalyzerRef.current || !config) return;
    frameDimsRef.current = { width: pose.frameWidth, height: pose.frameHeight };
    store.setKeypoints(pose.keypoints);
    store.pushFrame(pose);
    const phase = repCounterRef.current.update(
      config.primaryMetric(pose),
      pose.timestamp,
    );
    store.setPhase(phase);
    formAnalyzerRef.current.onFrame(pose, phase);
  }, []); // store methods are stable Zustand actions; refs guard the rest

  const frameOutput = usePoseFrameProcessor(onPose);

  async function handleStop() {
    setSaving(true);

    let videoLocalPath: string | undefined;
    if (recorderRef.current?.isRecording) {
      const path = await new Promise<string | null>((resolve) => {
        onVideoFinishedRef.current = resolve;
        recorderRef.current!.stopRecording().catch(() => resolve(null));
      });
      if (path) videoLocalPath = path;
    }

    setCameraActive(false);
    store.stopRecording();

    const sessionId = store.sessionId ?? Crypto.randomUUID();
    const { poseFrames, repSummaries, repCount, partialRepCount, startTime } = store;

    try {
      await savePoseFrames(sessionId, poseFrames);

      const rating = ratePerformance(repSummaries);
      const prompt = buildCoachingPrompt(config?.name ?? exercise!, repSummaries, rating);
      let feedback = '';
      try {
        feedback = await getCoachingFeedback(prompt);
      } catch {
        feedback = 'AI feedback unavailable. Check your API key in settings.';
      }

      await saveSession({
        id: sessionId,
        exerciseId: exercise!,
        recordedAt: startTime ?? Date.now(),
        repCount,
        partialRepCount,
        formScore: rating.avgFormScore,
        ratingScore: rating.score,
        claudeFeedback: feedback,
        durationMs: startTime ? Date.now() - startTime : undefined,
        videoLocalPath,
      });

      await saveRepEvents(sessionId, repSummaries);

      router.replace(`/session/${sessionId}`);
    } catch (err) {
      console.error('[Recording] Save error:', err);
      setSaving(false);
    }
  }

  const displayRect = {
    x: 0,
    y: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  };

  if (!device || !config) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          {!config ? `Unknown exercise "${exercise}"` : 'Camera not available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        zoom={device.minZoom}
        outputs={[frameOutput, videoOutput]}
      />

      {store.skeletonVisible && store.currentKeypoints.length > 0 && (
        <SkeletonCanvas
          keypoints={store.currentKeypoints}
          displayRect={displayRect}
          frameWidth={frameDimsRef.current.width}
          frameHeight={frameDimsRef.current.height}
        />
      )}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.repBubble}>
            <Text style={styles.repCount}>{store.repCount}</Text>
            <Text style={styles.repLabel}>REPS</Text>
          </View>
          {store.partialRepCount > 0 && (
            <Text style={styles.partialText}>
              {store.partialRepCount} partial
            </Text>
          )}
          <FormBadge score={store.formScore} />
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={store.toggleSkeleton}
          >
            <Text style={styles.toggleText}>
              {store.skeletonVisible ? 'Hide' : 'Show'} Skeleton
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopBtn, saving && styles.stopBtnDisabled]}
            onPress={handleStop}
            disabled={saving}
          >
            <Text style={styles.stopBtnText}>
              {saving ? 'Saving...' : 'Stop Set'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  repBubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  repCount: { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 44 },
  repLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 2 },
  partialText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    gap: 12,
  },
  toggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  stopBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  stopBtnDisabled: { opacity: 0.5 },
  stopBtnText: { color: '#111', fontSize: 18, fontWeight: '700' },
});
