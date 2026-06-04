import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Keypoint, DisplayRect } from '../pose/PoseTypes';
import {
  SKELETON_CONNECTIONS,
  connectionIsVisible,
  connectionColor,
} from './skeletonConnections';

interface Props {
  keypoints: Keypoint[];
  // The area the video/camera occupies on screen (accounts for letterboxing)
  displayRect: DisplayRect;
  // Actual frame dimensions used during inference
  frameWidth: number;
  frameHeight: number;
}

function normalizedToDisplay(
  kp: Keypoint,
  frameWidth: number,
  frameHeight: number,
  displayRect: DisplayRect
): { px: number; py: number } {
  // kp.x / kp.y are normalized 0–1 relative to the inference frame.
  // Map to display pixel coordinates within displayRect.
  const frameAspect = frameWidth / frameHeight;
  const displayAspect = displayRect.width / displayRect.height;

  let scaleX = 1;
  let scaleY = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (frameAspect > displayAspect) {
    // Frame is wider — letterbox top/bottom
    scaleX = displayRect.width;
    scaleY = displayRect.width / frameAspect;
    offsetY = (displayRect.height - scaleY) / 2;
  } else {
    // Frame is taller — pillarbox left/right
    scaleY = displayRect.height;
    scaleX = displayRect.height * frameAspect;
    offsetX = (displayRect.width - scaleX) / 2;
  }

  return {
    px: displayRect.x + offsetX + kp.x * scaleX,
    py: displayRect.y + offsetY + kp.y * scaleY,
  };
}

export const SkeletonCanvas = React.memo(function SkeletonCanvas({
  keypoints,
  displayRect,
  frameWidth,
  frameHeight,
}: Props) {
  if (!keypoints.length) return null;

  function toDisplay(kp: Keypoint) {
    return normalizedToDisplay(kp, frameWidth, frameHeight, displayRect);
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={displayRect.width} height={displayRect.height} style={{ position: 'absolute', left: displayRect.x, top: displayRect.y }}>
        {SKELETON_CONNECTIONS.map(([aIdx, bIdx]) => {
          const a = keypoints[aIdx];
          const b = keypoints[bIdx];
          if (!connectionIsVisible(a.score, b.score)) return null;
          const { px: x1, py: y1 } = toDisplay(a);
          const { px: x2, py: y2 } = toDisplay(b);
          const opacity = Math.min(a.score, b.score);
          return (
            <Line
              key={`${aIdx}-${bIdx}`}
              x1={x1 - displayRect.x}
              y1={y1 - displayRect.y}
              x2={x2 - displayRect.x}
              y2={y2 - displayRect.y}
              stroke={connectionColor(aIdx, bIdx)}
              strokeWidth={3}
              opacity={opacity}
            />
          );
        })}
        {keypoints.map((kp, i) => {
          if (kp.score < 0.3) return null;
          const { px, py } = toDisplay(kp);
          return (
            <Circle
              key={i}
              cx={px - displayRect.x}
              cy={py - displayRect.y}
              r={5}
              fill="#fff"
              opacity={kp.score}
            />
          );
        })}
      </Svg>
    </View>
  );
});
