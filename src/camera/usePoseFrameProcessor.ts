import { useCallback, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import { useFrameOutput } from 'react-native-vision-camera';
import type { CameraFrameOutput } from 'react-native-vision-camera';
import { detectPoseFromBuffer } from '@/pose/PoseEngine';
import type { PoseFrame } from '@/pose/PoseTypes';

export function usePoseFrameProcessor(
  onPose: (frame: PoseFrame) => void,
): CameraFrameOutput {
  const isProcessingRef = useRef(false);
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;

  const handleFrameOnJS = useCallback(
    (buffer: ArrayBuffer, width: number, height: number, timestamp: number) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      detectPoseFromBuffer(buffer, width, height, timestamp)
        .then((pose) => {
          if (pose) onPoseRef.current(pose);
        })
        .finally(() => {
          isProcessingRef.current = false;
        });
    },
    [],
  );

  return useFrameOutput({
    pixelFormat: 'rgb',
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      if (!frame.hasPixelBuffer) {
        frame.dispose();
        return;
      }
      const buffer = frame.getPixelBuffer();
      const width = frame.width;
      const height = frame.height;
      const timestamp = frame.timestamp;
      frame.dispose();
      runOnJS(handleFrameOnJS)(buffer, width, height, timestamp);
    },
  });
}
