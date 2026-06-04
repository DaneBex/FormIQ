import { RepFormSummary } from './FormAnalyzer';

export interface PerformanceRating {
  score: number;           // 0–10
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  fullRepRate: number;     // 0–1
  avgFormScore: number;    // 0–1
}

export function ratePerformance(reps: RepFormSummary[]): PerformanceRating {
  if (!reps.length) {
    return { score: 0, grade: 'F', fullRepRate: 0, avgFormScore: 0 };
  }

  const fullRepRate = reps.filter((r) => r.isFullRep).length / reps.length;
  const avgFormScore = reps.reduce((s, r) => s + r.score, 0) / reps.length;

  // Weighted: 60% form quality, 40% full rep rate
  const raw = avgFormScore * 0.6 + fullRepRate * 0.4;
  const score = Math.round(raw * 10 * 10) / 10;

  const grade =
    score >= 9 ? 'A' :
    score >= 7 ? 'B' :
    score >= 5 ? 'C' :
    score >= 3 ? 'D' : 'F';

  return { score, grade, fullRepRate, avgFormScore };
}
