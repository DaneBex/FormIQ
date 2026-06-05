import { useCallback, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import { useFrameOutput, CommonResolutions } from 'react-native-vision-camera';
import type { CameraFrameOutput } from 'react-native-vision-camera';
import { detectPoseFromBuffer } from '@/pose/PoseEngine';
import type { PoseFrame } from '@/pose/PoseTypes';

// VisionCamera v5 'rgb' resolves to BGRA (4 bytes/pixel) on iOS.
// Convert to packed RGB (3 bytes/pixel) that MoveNet expects.
function bgraToRgb(src: Uint8Array, width: number, height: number, bytesPerRow: number): ArrayBuffer {
  const dst = new Uint8Array(width * height * 3);
  for (let row = 0; row < height; row++) {
    const rowOffset = row * bytesPerRow;
    const dstRowOffset = row * width * 3;
    for (let col = 0; col < width; col++) {
      const s = rowOffset + col * 4;
      const d = dstRowOffset + col * 3;
      dst[d]     = src[s + 2]; // R (BGRA[2])
      dst[d + 1] = src[s + 1]; // G (BGRA[1])
      dst[d + 2] = src[s];     // B (BGRA[0])
    }
  }
  return dst.buffer;
}

export function usePoseFrameProcessor(
  onPose: (frame: PoseFrame) => void,
): CameraFrameOutput {
  const isProcessingRef = useRef(false);
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;

  const handleFrameOnJS = useCallback(
    (rawBuffer: ArrayBuffer, width: number, height: number, timestamp: number, bytesPerRow: number) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const src = new Uint8Array(rawBuffer);
      const channelsPerPixel = bytesPerRow / width;
      const buffer = channelsPerPixel === 4
        ? bgraToRgb(src, width, height, bytesPerRow)
        : rawBuffer;

      detectPoseFromBuffer(buffer, width, height, timestamp)
        .then((pose) => {
          if (pose) onPoseRef.current(pose);
        })
        .catch((err) => {
          console.warn('[PoseFrameProcessor] inference error:', err);
        })
        .finally(() => {
          isProcessingRef.current = false;
        });
    },
    [],
  );

  return useFrameOutput({
    pixelFormat: 'rgb',
    targetResolution: CommonResolutions.VGA_16_9,
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      try {
        if (!frame.hasPixelBuffer) return;
        const rawBuffer = frame.getPixelBuffer();
        const width = frame.width;
        const height = frame.height;
        const timestamp = frame.timestamp;
        const bytesPerRow = frame.bytesPerRow;
        const buffer = rawBuffer.slice(0);
        runOnJS(handleFrameOnJS)(buffer, width, height, timestamp, bytesPerRow);
      } finally {
        frame.dispose();
      }
    },
  });
}
