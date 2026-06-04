export enum KeypointName {
  NOSE = 0,
  LEFT_EYE = 1,
  RIGHT_EYE = 2,
  LEFT_EAR = 3,
  RIGHT_EAR = 4,
  LEFT_SHOULDER = 5,
  RIGHT_SHOULDER = 6,
  LEFT_ELBOW = 7,
  RIGHT_ELBOW = 8,
  LEFT_WRIST = 9,
  RIGHT_WRIST = 10,
  LEFT_HIP = 11,
  RIGHT_HIP = 12,
  LEFT_KNEE = 13,
  RIGHT_KNEE = 14,
  LEFT_ANKLE = 15,
  RIGHT_ANKLE = 16,
}

export interface Keypoint {
  x: number;       // normalized 0–1 (relative to MoveNet input tensor)
  y: number;
  score: number;   // confidence 0–1
}

export interface PoseFrame {
  timestamp: number;       // ms since recording start
  frameIndex: number;
  keypoints: Keypoint[];   // length 17 (MoveNet Lightning)
  frameWidth: number;      // original camera frame dimensions
  frameHeight: number;
}

export interface DisplayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
