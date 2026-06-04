import { supabase } from './client';
import { Session } from '../storage/SessionRepository';

export async function syncSession(session: Session, userId: string): Promise<void> {
  const { error } = await supabase.from('sessions').upsert({
    id: session.id,
    user_id: userId,
    exercise: session.exerciseId,
    recorded_at: new Date(session.recordedAt).toISOString(),
    video_local_path: session.videoLocalPath ?? null,
    rep_count: session.repCount,
    partial_rep_count: session.partialRepCount,
    form_score: session.formScore ?? null,
    rating_score: session.ratingScore ?? null,
    claude_feedback: session.claudeFeedback ?? null,
    duration_ms: session.durationMs ?? null,
  });

  if (error) {
    console.warn('[SessionSync] Failed to sync session:', error.message);
  }
}
