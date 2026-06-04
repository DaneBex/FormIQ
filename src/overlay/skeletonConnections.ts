import { KeypointName } from '../pose/PoseTypes';

// Each pair is [from, to] keypoint indices
export const SKELETON_CONNECTIONS: [KeypointName, KeypointName][] = [
  // Head
  [KeypointName.LEFT_EYE, KeypointName.NOSE],
  [KeypointName.RIGHT_EYE, KeypointName.NOSE],
  [KeypointName.LEFT_EAR, KeypointName.LEFT_EYE],
  [KeypointName.RIGHT_EAR, KeypointName.RIGHT_EYE],
  // Torso
  [KeypointName.LEFT_SHOULDER, KeypointName.RIGHT_SHOULDER],
  [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_HIP],
  [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_HIP],
  [KeypointName.LEFT_HIP, KeypointName.RIGHT_HIP],
  // Arms
  [KeypointName.LEFT_SHOULDER, KeypointName.LEFT_ELBOW],
  [KeypointName.LEFT_ELBOW, KeypointName.LEFT_WRIST],
  [KeypointName.RIGHT_SHOULDER, KeypointName.RIGHT_ELBOW],
  [KeypointName.RIGHT_ELBOW, KeypointName.RIGHT_WRIST],
  // Legs
  [KeypointName.LEFT_HIP, KeypointName.LEFT_KNEE],
  [KeypointName.LEFT_KNEE, KeypointName.LEFT_ANKLE],
  [KeypointName.RIGHT_HIP, KeypointName.RIGHT_KNEE],
  [KeypointName.RIGHT_KNEE, KeypointName.RIGHT_ANKLE],
];

const CONFIDENCE_THRESHOLD = 0.3;

export function connectionIsVisible(scoreA: number, scoreB: number): boolean {
  return scoreA >= CONFIDENCE_THRESHOLD && scoreB >= CONFIDENCE_THRESHOLD;
}

// Color by body part group
export function connectionColor(a: KeypointName, b: KeypointName): string {
  if (a <= 4 || b <= 4) return '#FFD700'; // head — gold
  if (
    (a === KeypointName.LEFT_SHOULDER || a === KeypointName.LEFT_ELBOW || a === KeypointName.LEFT_WRIST ||
     b === KeypointName.LEFT_SHOULDER || b === KeypointName.LEFT_ELBOW || b === KeypointName.LEFT_WRIST)
  ) return '#4FC3F7'; // left arm — blue
  if (
    (a === KeypointName.RIGHT_SHOULDER || a === KeypointName.RIGHT_ELBOW || a === KeypointName.RIGHT_WRIST ||
     b === KeypointName.RIGHT_SHOULDER || b === KeypointName.RIGHT_ELBOW || b === KeypointName.RIGHT_WRIST)
  ) return '#81D4FA'; // right arm — lighter blue
  if (
    a === KeypointName.LEFT_HIP || a === KeypointName.LEFT_KNEE || a === KeypointName.LEFT_ANKLE ||
    b === KeypointName.LEFT_HIP || b === KeypointName.LEFT_KNEE || b === KeypointName.LEFT_ANKLE
  ) return '#A5D6A7'; // left leg — green
  if (
    a === KeypointName.RIGHT_HIP || a === KeypointName.RIGHT_KNEE || a === KeypointName.RIGHT_ANKLE ||
    b === KeypointName.RIGHT_HIP || b === KeypointName.RIGHT_KNEE || b === KeypointName.RIGHT_ANKLE
  ) return '#C8E6C9'; // right leg — lighter green
  return '#E0E0E0'; // torso — white/grey
}
