import { PoseFrame, KeypointName } from '../../pose/PoseTypes';
import { angleBetweenThreePoints, distanceBetween, angleFromVertical } from '../../pose/PoseMath';
import { ExerciseConfig, FormCheck } from '../ExerciseRegistry';
import { RepPhase } from '../RepCounter';

// Primary metric: knee angle (hip→knee→ankle on the side that's more visible)
function kneeAngle(frame: PoseFrame): number {
  const kps = frame.keypoints;
  const leftConfident =
    Math.min(
      kps[KeypointName.LEFT_HIP].score,
      kps[KeypointName.LEFT_KNEE].score,
      kps[KeypointName.LEFT_ANKLE].score
    ) > 0.4;

  if (leftConfident) {
    return angleBetweenThreePoints(
      kps[KeypointName.LEFT_HIP],
      kps[KeypointName.LEFT_KNEE],
      kps[KeypointName.LEFT_ANKLE]
    );
  }
  // fall back to right side
  return angleBetweenThreePoints(
    kps[KeypointName.RIGHT_HIP],
    kps[KeypointName.RIGHT_KNEE],
    kps[KeypointName.RIGHT_ANKLE]
  );
}

const FORM_CHECKS: FormCheck[] = [
  {
    id: 'squat_depth',
    name: 'Squat Depth',
    severity: 'error',
    check(frame, phase) {
      if (phase !== 'BOTTOM') return null;
      const angle = kneeAngle(frame);
      if (angle > 100) {
        return {
          checkId: 'squat_depth',
          severity: 'error',
          confidence: 0.9,
          frameTimestamp: frame.timestamp,
          details: `Knee angle at bottom was ${angle.toFixed(0)}° — target ≤100° (parallel). Did not reach depth.`,
        };
      }
      return null;
    },
  },
  {
    id: 'knee_valgus',
    name: 'Knee Valgus',
    severity: 'warning',
    check(frame, phase) {
      if (phase !== 'BOTTOM' && phase !== 'ASCENDING') return null;
      const kps = frame.keypoints;
      const kneeWidth = distanceBetween(
        kps[KeypointName.LEFT_KNEE],
        kps[KeypointName.RIGHT_KNEE]
      );
      const ankleWidth = distanceBetween(
        kps[KeypointName.LEFT_ANKLE],
        kps[KeypointName.RIGHT_ANKLE]
      );
      if (ankleWidth < 0.01) return null; // can't measure
      const ratio = kneeWidth / ankleWidth;
      if (ratio < 0.82) {
        return {
          checkId: 'knee_valgus',
          severity: 'warning',
          confidence: 0.8,
          frameTimestamp: frame.timestamp,
          details: `Knee width/ankle width ratio was ${ratio.toFixed(2)} — knees collapsing inward.`,
        };
      }
      return null;
    },
  },
  {
    id: 'heel_lift',
    name: 'Heel Lift',
    severity: 'warning',
    check(frame, phase) {
      // Heel lift tracked via ankle Y position change — handled in FormAnalyzer with history
      return null;
    },
  },
  {
    id: 'forward_lean',
    name: 'Excessive Forward Lean',
    severity: 'warning',
    check(frame, phase) {
      if (phase !== 'BOTTOM') return null;
      const kps = frame.keypoints;
      const shoulder = kps[KeypointName.LEFT_SHOULDER];
      const hip = kps[KeypointName.LEFT_HIP];
      if (shoulder.score < 0.4 || hip.score < 0.4) return null;
      const lean = angleFromVertical(shoulder, hip);
      if (lean > 50) {
        return {
          checkId: 'forward_lean',
          severity: 'warning',
          confidence: 0.75,
          frameTimestamp: frame.timestamp,
          details: `Torso lean at bottom was ${lean.toFixed(0)}° from vertical — excessive forward lean.`,
        };
      }
      return null;
    },
  },
];

export const squatConfig: ExerciseConfig = {
  id: 'squat',
  name: 'Squat',
  cameraAngle: 'side',
  requiredKeypoints: [
    KeypointName.LEFT_HIP,
    KeypointName.LEFT_KNEE,
    KeypointName.LEFT_ANKLE,
  ],
  primaryMetric: kneeAngle,
  stateThresholds: {
    descentStart: 162,   // knee angle drops below this → DESCENDING
    fullRepTarget: 100,  // must reach below this for a full rep (parallel)
    ascentEnd: 155,      // knee angle rises above this → rep complete
  },
  formChecks: FORM_CHECKS,
};
