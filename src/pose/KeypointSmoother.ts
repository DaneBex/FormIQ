import { Keypoint } from './PoseTypes';

const ALPHA = 0.35; // EMA smoothing factor — higher = more responsive, less smooth

export class KeypointSmoother {
  private smoothed: Keypoint[] | null = null;

  smooth(raw: Keypoint[]): Keypoint[] {
    if (!this.smoothed) {
      this.smoothed = raw.map((kp) => ({ ...kp }));
      return this.smoothed;
    }

    this.smoothed = raw.map((kp, i) => {
      const prev = this.smoothed![i];
      return {
        x: ALPHA * kp.x + (1 - ALPHA) * prev.x,
        y: ALPHA * kp.y + (1 - ALPHA) * prev.y,
        score: ALPHA * kp.score + (1 - ALPHA) * prev.score,
      };
    });

    return this.smoothed;
  }

  reset(): void {
    this.smoothed = null;
  }
}
