import { PoseFrame } from '../pose/PoseTypes';
import { RepPhase, RepEvent } from './RepCounter';
import { ExerciseConfig, FormIssue } from './ExerciseRegistry';

export interface RepFormSummary {
  repIndex: number;
  isFullRep: boolean;
  issues: FormIssue[];
  score: number;      // 0.0–1.0
  startTimestamp: number;
  endTimestamp: number;
}

const ISSUE_PENALTIES: Record<string, number> = {
  error: 0.25,
  warning: 0.10,
};

// How often to run form checks (every Nth frame)
const SAMPLE_EVERY_N_FRAMES = 3;

export class FormAnalyzer {
  private issueBuffer: FormIssue[] = [];
  private frameCount = 0;

  constructor(private readonly config: ExerciseConfig) {}

  onFrame(frame: PoseFrame, phase: RepPhase): void {
    this.frameCount++;
    if (this.frameCount % SAMPLE_EVERY_N_FRAMES !== 0) return;

    for (const check of this.config.formChecks) {
      const issue = check.check(frame, phase);
      if (issue) {
        // Deduplicate: don't add the same checkId twice within 500ms
        const recent = this.issueBuffer.find(
          (i) =>
            i.checkId === issue.checkId &&
            frame.timestamp - i.frameTimestamp < 500
        );
        if (!recent) {
          this.issueBuffer.push(issue);
        }
      }
    }
  }

  collectRep(event: RepEvent): RepFormSummary {
    const repIssues = this.issueBuffer.filter(
      (i) =>
        i.frameTimestamp >= event.startTimestamp &&
        i.frameTimestamp <= event.endTimestamp
    );

    // Remove collected issues from buffer
    this.issueBuffer = this.issueBuffer.filter(
      (i) =>
        i.frameTimestamp < event.startTimestamp ||
        i.frameTimestamp > event.endTimestamp
    );

    // Deduplicate by checkId within the rep (keep highest severity)
    const deduped = new Map<string, FormIssue>();
    for (const issue of repIssues) {
      const existing = deduped.get(issue.checkId);
      if (!existing || issue.severity === 'error') {
        deduped.set(issue.checkId, issue);
      }
    }

    const uniqueIssues = Array.from(deduped.values());
    const penalty = uniqueIssues.reduce(
      (sum, i) => sum + ISSUE_PENALTIES[i.severity],
      0
    );
    const score = Math.max(0, 1 - penalty);

    return {
      repIndex: event.repIndex,
      isFullRep: event.isFullRep,
      issues: uniqueIssues,
      score,
      startTimestamp: event.startTimestamp,
      endTimestamp: event.endTimestamp,
    };
  }

  reset(): void {
    this.issueBuffer = [];
    this.frameCount = 0;
  }
}
