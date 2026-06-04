import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSession } from '@/storage/SessionRepository';
import { loadPoseFrames } from '@/storage/PoseFrameRepository';
import { usePlaybackSync } from '@/overlay/usePlaybackSync';
import { SkeletonCanvas } from '@/overlay/SkeletonCanvas';
import { Session } from '@/storage/SessionRepository';
import { PoseFrame } from '@/pose/PoseTypes';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_H = (SCREEN_W * 16) / 9;

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [poseFrames, setPoseFrames] = useState<PoseFrame[]>([]);
  const [skeletonVisible, setSkeletonVisible] = useState(true);

  const player = useVideoPlayer(session?.videoLocalPath ?? null, (p) => {
    p.loop = false;
  });

  const { currentKeypoints, seekTo } = usePlaybackSync(poseFrames);

  useEffect(() => {
    if (!id) return;
    getSession(id).then(setSession);
    loadPoseFrames(id).then(setPoseFrames);
  }, [id]);

  // Sync skeleton to video time
  useEffect(() => {
    if (!player || !poseFrames.length) return;
    const interval = setInterval(() => {
      seekTo(player.currentTime * 1000);
    }, 33); // ~30fps polling
    return () => clearInterval(interval);
  }, [player, poseFrames, seekTo]);

  if (!session) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  const displayRect = { x: 0, y: 0, width: SCREEN_W, height: VIDEO_H };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Video player with skeleton overlay */}
        <View style={{ width: SCREEN_W, height: VIDEO_H, backgroundColor: '#000' }}>
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
          />
          {skeletonVisible && currentKeypoints.length > 0 && (
            <SkeletonCanvas
              keypoints={currentKeypoints}
              displayRect={displayRect}
              frameWidth={1080}
              frameHeight={1920}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.skeletonToggle}
          onPress={() => setSkeletonVisible((v) => !v)}
        >
          <Text style={styles.skeletonToggleText}>
            {skeletonVisible ? 'Hide' : 'Show'} Skeleton Overlay
          </Text>
        </TouchableOpacity>

        <View style={styles.meta}>
          <Text style={styles.exerciseName}>{session.exerciseId}</Text>
          <Text style={styles.metaLine}>
            {session.repCount} reps · {session.partialRepCount} partial
          </Text>
          {session.ratingScore != null && (
            <Text style={styles.metaLine}>
              Score: {session.ratingScore.toFixed(1)}/10
            </Text>
          )}
        </View>

        {session.claudeFeedback ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackHeading}>AI Analysis</Text>
            <Text style={styles.feedbackText}>{session.claudeFeedback}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#888' },
  skeletonToggle: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  skeletonToggleText: { fontSize: 15, fontWeight: '600', color: '#111' },
  meta: { padding: 24 },
  exerciseName: { fontSize: 24, fontWeight: '700', color: '#111', textTransform: 'capitalize' },
  metaLine: { fontSize: 15, color: '#666', marginTop: 6 },
  feedbackCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#111',
  },
  feedbackHeading: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 10 },
  feedbackText: { fontSize: 15, color: '#333', lineHeight: 24 },
});
