import { PoseFrame, KeypointName } from '../pose/PoseTypes';
import { StateThresholds, RepPhase } from './RepCounter';
import { squatConfig } from './exercises/squat';

export interface FormIssue {
  checkId: string;
  severity: 'warning' | 'error';
  confidence: number;
  frameTimestamp: number;
  details: string;
}

export interface FormCheck {
  id: string;
  name: string;
  severity: 'warning' | 'error';
  check: (frame: PoseFrame, phase: RepPhase) => FormIssue | null;
}

export interface ExerciseConfig {
  id: string;
  name: string;
  cameraAngle: 'side' | 'front' | 'either';
  requiredKeypoints: KeypointName[];
  primaryMetric: (frame: PoseFrame) => number;
  stateThresholds: StateThresholds;
  formChecks: FormCheck[];
}

const registry: Record<string, ExerciseConfig> = {
  squat: squatConfig,
  // More exercises added in Phase 2:
  // deadlift: deadliftConfig,
  // bench_press: benchPressConfig,
  // overhead_press: overheadPressConfig,
  // push_up: pushUpConfig,
  // pull_up: pullUpConfig,
  // lunge: lungeConfig,
};

export function getExerciseConfig(id: string): ExerciseConfig | null {
  return registry[id] ?? null;
}

export function getAllExercises(): ExerciseConfig[] {
  return Object.values(registry);
}
