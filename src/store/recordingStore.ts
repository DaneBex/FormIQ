import { create } from 'zustand';
import { PoseFrame, Keypoint } from '../pose/PoseTypes';
import { RepPhase } from '../analysis/RepCounter';
import { RepFormSummary } from '../analysis/FormAnalyzer';

interface RecordingState {
  isRecording: boolean;
  exerciseId: string | null;
  sessionId: string | null;
  startTime: number | null;

  // Live inference output
  currentKeypoints: Keypoint[];
  currentPhase: RepPhase;
  repCount: number;
  partialRepCount: number;
  formScore: number;       // 0–1 for current rep
  skeletonVisible: boolean;

  // Buffered pose frames (flushed to SQLite on stop)
  poseFrames: PoseFrame[];

  // Completed rep summaries
  repSummaries: RepFormSummary[];

  // Actions
  startRecording: (exerciseId: string, sessionId: string) => void;
  stopRecording: () => void;
  setKeypoints: (keypoints: Keypoint[]) => void;
  setPhase: (phase: RepPhase) => void;
  incrementRep: (isFullRep: boolean) => void;
  setFormScore: (score: number) => void;
  pushFrame: (frame: PoseFrame) => void;
  addRepSummary: (summary: RepFormSummary) => void;
  toggleSkeleton: () => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  exerciseId: null,
  sessionId: null,
  startTime: null,
  currentKeypoints: [],
  currentPhase: 'IDLE',
  repCount: 0,
  partialRepCount: 0,
  formScore: 1,
  skeletonVisible: true,
  poseFrames: [],
  repSummaries: [],

  startRecording: (exerciseId, sessionId) =>
    set({
      isRecording: true,
      exerciseId,
      sessionId,
      startTime: Date.now(),
      repCount: 0,
      partialRepCount: 0,
      poseFrames: [],
      repSummaries: [],
    }),

  stopRecording: () => set({ isRecording: false }),

  setKeypoints: (keypoints) => set({ currentKeypoints: keypoints }),

  setPhase: (phase) => set({ currentPhase: phase }),

  incrementRep: (isFullRep) =>
    set((s) =>
      isFullRep
        ? { repCount: s.repCount + 1 }
        : { partialRepCount: s.partialRepCount + 1 }
    ),

  setFormScore: (formScore) => set({ formScore }),

  pushFrame: (frame) =>
    set((s) => ({ poseFrames: [...s.poseFrames, frame] })),

  addRepSummary: (summary) =>
    set((s) => ({ repSummaries: [...s.repSummaries, summary] })),

  toggleSkeleton: () =>
    set((s) => ({ skeletonVisible: !s.skeletonVisible })),

  reset: () =>
    set({
      isRecording: false,
      exerciseId: null,
      sessionId: null,
      startTime: null,
      currentKeypoints: [],
      currentPhase: 'IDLE',
      repCount: 0,
      partialRepCount: 0,
      formScore: 1,
      skeletonVisible: true,
      poseFrames: [],
      repSummaries: [],
    }),
}));
