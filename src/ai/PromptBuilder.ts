import { RepFormSummary } from '../analysis/FormAnalyzer';
import { PerformanceRating } from '../analysis/PerformanceRater';

export function buildCoachingPrompt(
  exerciseName: string,
  reps: RepFormSummary[],
  rating: PerformanceRating
): string {
  const fullReps = reps.filter((r) => r.isFullRep).length;
  const partialReps = reps.length - fullReps;

  const repLines = reps
    .map((rep) => {
      const issueText =
        rep.issues.length === 0
          ? 'No issues detected.'
          : rep.issues.map((i) => `    • [${i.severity.toUpperCase()}] ${i.details}`).join('\n');
      return `  Rep ${rep.repIndex + 1} (${rep.isFullRep ? 'full' : 'PARTIAL'}, form score ${(rep.score * 100).toFixed(0)}%):\n${issueText}`;
    })
    .join('\n');

  return `You are a clinical exercise form analyst. Provide objective, data-focused coaching feedback for the following set.

Exercise: ${exerciseName}
Total reps: ${reps.length} (${fullReps} full, ${partialReps} partial)
Overall score: ${rating.score.toFixed(1)}/10 (grade ${rating.grade})
Average form score: ${(rating.avgFormScore * 100).toFixed(0)}%
Full rep rate: ${(rating.fullRepRate * 100).toFixed(0)}%

Per-rep breakdown:
${repLines}

Provide 4–5 bullet points of clinical coaching feedback. Each bullet must:
- Reference specific measured values (angles, ratios, percentages) from the data above where available
- State the issue, the measurement, and the target
- Prioritize by impact on injury risk and performance

Do not use motivational language. Be direct and precise.`;
}
