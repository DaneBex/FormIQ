import { getDb } from './db';
import { RepFormSummary } from '../analysis/FormAnalyzer';
import { PerformanceRating } from '../analysis/PerformanceRater';

export interface Session {
  id: string;
  exerciseId: string;
  recordedAt: number;
  videoLocalPath?: string;
  repCount: number;
  partialRepCount: number;
  formScore?: number;
  ratingScore?: number;
  claudeFeedback?: string;
  durationMs?: number;
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions
      (id, exercise_id, recorded_at, video_local_path, rep_count, partial_rep_count,
       form_score, rating_score, claude_feedback, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.exerciseId,
      session.recordedAt,
      session.videoLocalPath ?? null,
      session.repCount,
      session.partialRepCount,
      session.formScore ?? null,
      session.ratingScore ?? null,
      session.claudeFeedback ?? null,
      session.durationMs ?? null,
    ]
  );
}

export async function saveRepEvents(
  sessionId: string,
  reps: RepFormSummary[]
): Promise<void> {
  const db = await getDb();
  for (const rep of reps) {
    await db.runAsync(
      `INSERT INTO rep_events
        (session_id, rep_index, start_timestamp_ms, end_timestamp_ms, form_score, is_full_rep, issues)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        rep.repIndex,
        rep.startTimestamp,
        rep.endTimestamp,
        rep.score,
        rep.isFullRep ? 1 : 0,
        JSON.stringify(rep.issues),
      ]
    );
  }
}

export async function getSessions(): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM sessions ORDER BY recorded_at DESC'
  );
  return rows.map(rowToSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  return row ? rowToSession(row) : null;
}

function rowToSession(row: any): Session {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    recordedAt: row.recorded_at,
    videoLocalPath: row.video_local_path ?? undefined,
    repCount: row.rep_count,
    partialRepCount: row.partial_rep_count,
    formScore: row.form_score ?? undefined,
    ratingScore: row.rating_score ?? undefined,
    claudeFeedback: row.claude_feedback ?? undefined,
    durationMs: row.duration_ms ?? undefined,
  };
}
