import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from 'react-native-vision-camera';
import { usePoseFrameProcessor } from '@/camera/usePoseFrameProcessor';
import type { PoseFrame } from '@/pose/PoseTypes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCamera } from '@/camera/useCamera';
import { getExerciseConfig } from '@/analysis/ExerciseRegistry';
import { initPoseEngine } from '@/pose/PoseEngine';

const CONFIDENCE_THRESHOLD = 0.5;
const REQUIRED_CONSECUTIVE_FRAMES = 10;

export default function CameraPositionScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const router = useRouter();
  const config = getExerciseConfig(exercise ?? '');
  const { device, hasPermission, requestPermission } = useCamera();
  const [engineReady, setEngineReady] = useState(false);
  const [confidenceFrames, setConfidenceFrames] = useState(0);
  const consecutiveRef = useRef(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
    initPoseEngine().then(() => setEngineReady(true));
  }, []);

  const isReady = confidenceFrames >= REQUIRED_CONSECUTIVE_FRAMES;

  const onPose = useCallback((pose: PoseFrame) => {
    if (!config) return;
    const allConfident = config.requiredKeypoints.every(
      (kp) => (pose.keypoints[kp]?.score ?? 0) >= CONFIDENCE_THRESHOLD,
    );
    if (allConfident) {
      consecutiveRef.current += 1;
      if (consecutiveRef.current >= REQUIRED_CONSECUTIVE_FRAMES) {
        setConfidenceFrames(REQUIRED_CONSECUTIVE_FRAMES);
      }
    } else {
      consecutiveRef.current = 0;
      setConfidenceFrames(0);
    }
  }, [config]);

  const frameOutput = usePoseFrameProcessor(onPose);

  return (
    <SafeAreaView style={styles.container}>
      {device && hasPermission && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          outputs={[frameOutput]}
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.topBanner}>
          <Text style={styles.bannerText}>
            {config?.cameraAngle === 'side'
              ? 'Position camera to your side — full body in frame'
              : 'Face the camera — full body in frame'}
          </Text>
        </View>

        {/* Silhouette placeholder */}
        <View style={styles.silhouette} pointerEvents="none" />

        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusDot,
              isReady ? styles.dotGreen : styles.dotYellow,
            ]}
          />
          <Text style={styles.statusText}>
            {!engineReady
              ? 'Loading AI model...'
              : isReady
              ? 'Good position — ready!'
              : 'Adjust position until all keypoints are detected'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.readyBtn, !isReady && styles.readyBtnDisabled]}
          disabled={!isReady}
          onPress={() =>
            router.push(`/record/${exercise}`)
          }
        >
          <Text style={styles.readyBtnText}>Start Recording</Text>
        </TouchableOpacity>

        {/* Dev override — skip confidence check in development */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devOverride}
            onPress={() => setConfidenceFrames(REQUIRED_CONSECUTIVE_FRAMES)}
          >
            <Text style={styles.devText}>DEV: Skip position check</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  topBanner: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  bannerText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  silhouette: {
    alignSelf: 'center',
    width: 140,
    height: 280,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 70,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotYellow: { backgroundColor: '#FFC107' },
  statusText: { color: '#fff', fontSize: 14, flex: 1 },
  readyBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  readyBtnDisabled: { opacity: 0.4 },
  readyBtnText: { fontSize: 18, fontWeight: '700', color: '#111' },
  devOverride: { alignSelf: 'center', marginTop: 8 },
  devText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});
