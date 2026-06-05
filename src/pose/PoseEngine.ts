import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { Keypoint, PoseFrame } from './PoseTypes';
import { KeypointSmoother } from './KeypointSmoother';

let detector: poseDetection.PoseDetector | null = null;
let isReady = false;
let frameCounter = 0;
const smoother = new KeypointSmoother();

export async function initPoseEngine(): Promise<void> {
  if (isReady) return;

  await tf.ready();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: false, // we handle smoothing ourselves
    }
  );

  isReady = true;
}

export function isPoseEngineReady(): boolean {
  return isReady;
}

export async function detectPose(
  imageTensor: tf.Tensor3D,
  timestamp: number,
  frameIndex: number,
  frameWidth: number,
  frameHeight: number
): Promise<PoseFrame | null> {
  if (!detector) return null;

  const poses = await detector.estimatePoses(imageTensor);
  if (!poses.length) return null;

  const raw: Keypoint[] = poses[0].keypoints.map((kp) => ({
    x: (kp.x ?? 0) / frameWidth,
    y: (kp.y ?? 0) / frameHeight,
    score: kp.score ?? 0,
  }));

  const keypoints = smoother.smooth(raw);

  return {
    timestamp,
    frameIndex,
    keypoints,
    frameWidth,
    frameHeight,
  };
}

export async function detectPoseFromBuffer(
  buffer: ArrayBuffer,
  frameWidth: number,
  frameHeight: number,
  timestamp: number,
): Promise<PoseFrame | null> {
  if (!detector) return null;

  if (!buffer || buffer.byteLength === 0) return null;

  let imageTensor: tf.Tensor3D | null = null;
  try {
    imageTensor = tf.tensor3d(
      new Uint8Array(buffer),
      [frameHeight, frameWidth, 3],
      'int32',
    );
    return await detectPose(imageTensor, timestamp, frameCounter++, frameWidth, frameHeight);
  } catch {
    return null;
  } finally {
    imageTensor?.dispose();
  }
}

export function resetSmoother(): void {
  smoother.reset();
}

export function resetFrameCounter(): void {
  frameCounter = 0;
}
