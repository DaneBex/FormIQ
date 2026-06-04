import { useState, useCallback } from 'react';
import { PoseFrame, Keypoint } from '../pose/PoseTypes';

function binarySearchNearest(frames: PoseFrame[], targetMs: number): number {
  if (!frames.length) return -1;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].timestamp < targetMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  // Check lo and lo-1 to find nearest
  if (lo > 0) {
    const before = Math.abs(frames[lo - 1].timestamp - targetMs);
    const after = Math.abs(frames[lo].timestamp - targetMs);
    return before < after ? lo - 1 : lo;
  }
  return lo;
}

export function usePlaybackSync(poseFrames: PoseFrame[]) {
  const [currentKeypoints, setCurrentKeypoints] = useState<Keypoint[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const seekTo = useCallback(
    (videoTimeMs: number) => {
      const idx = binarySearchNearest(poseFrames, videoTimeMs);
      if (idx >= 0 && poseFrames[idx]) {
        setCurrentKeypoints(poseFrames[idx].keypoints);
        setCurrentFrameIndex(idx);
      }
    },
    [poseFrames]
  );

  return { currentKeypoints, currentFrameIndex, seekTo };
}
