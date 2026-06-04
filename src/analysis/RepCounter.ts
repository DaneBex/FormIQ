export type RepPhase =
  | 'IDLE'
  | 'DESCENDING'
  | 'BOTTOM'
  | 'ASCENDING'
  | 'PARTIAL_ASCENDING'
  | 'TOP';

export interface RepEvent {
  repIndex: number;
  isFullRep: boolean;
  startTimestamp: number;
  endTimestamp: number;
}

export interface StateThresholds {
  descentStart: number;    // metric crosses below this → DESCENDING
  fullRepTarget: number;   // must reach below this → BOTTOM (full rep)
  ascentEnd: number;       // metric crosses above this → TOP (set higher than descentStart)
}

export type RepEventListener = (event: RepEvent) => void;

const MIN_TIME_IN_STATE_MS = 80; // debounce rapid oscillation

export class RepCounter {
  private phase: RepPhase = 'IDLE';
  private repIndex = 0;
  private repStartTs = 0;
  private reachedBottom = false;
  private lastTransitionTs = 0;
  private listeners: RepEventListener[] = [];

  constructor(private readonly thresholds: StateThresholds) {}

  onRep(listener: RepEventListener): void {
    this.listeners.push(listener);
  }

  update(metric: number, timestamp: number): RepPhase {
    const { descentStart, fullRepTarget, ascentEnd } = this.thresholds;
    const timeSinceTransition = timestamp - this.lastTransitionTs;

    if (timeSinceTransition < MIN_TIME_IN_STATE_MS) return this.phase;

    switch (this.phase) {
      case 'IDLE':
        if (metric < descentStart) {
          this.phase = 'DESCENDING';
          this.repStartTs = timestamp;
          this.reachedBottom = false;
          this.lastTransitionTs = timestamp;
        }
        break;

      case 'DESCENDING':
        if (metric < fullRepTarget) {
          this.phase = 'BOTTOM';
          this.reachedBottom = true;
          this.lastTransitionTs = timestamp;
        } else if (metric > descentStart) {
          // reversed without reaching bottom
          this.phase = 'PARTIAL_ASCENDING';
          this.lastTransitionTs = timestamp;
        }
        break;

      case 'BOTTOM':
        if (metric > fullRepTarget) {
          this.phase = 'ASCENDING';
          this.lastTransitionTs = timestamp;
        }
        break;

      case 'ASCENDING':
        if (metric > ascentEnd) {
          this.emit(true, timestamp);
          this.phase = 'IDLE';
          this.lastTransitionTs = timestamp;
        }
        break;

      case 'PARTIAL_ASCENDING':
        if (metric > ascentEnd) {
          this.emit(false, timestamp);
          this.phase = 'IDLE';
          this.lastTransitionTs = timestamp;
        }
        break;
    }

    return this.phase;
  }

  getPhase(): RepPhase { return this.phase; }
  getRepCount(): number { return this.repIndex; }

  reset(): void {
    this.phase = 'IDLE';
    this.repIndex = 0;
    this.repStartTs = 0;
    this.reachedBottom = false;
    this.lastTransitionTs = 0;
  }

  private emit(isFullRep: boolean, endTimestamp: number): void {
    const event: RepEvent = {
      repIndex: this.repIndex++,
      isFullRep,
      startTimestamp: this.repStartTs,
      endTimestamp,
    };
    this.listeners.forEach((l) => l(event));
  }
}
