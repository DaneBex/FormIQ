import * as msgpack from 'msgpack-lite';
import { getDb } from './db';
import { PoseFrame } from '../pose/PoseTypes';

export async function savePoseFrames(
  sessionId: string,
  frames: PoseFrame[]
): Promise<void> {
  const db = await getDb();
  const blob = msgpack.encode(frames);
  await db.runAsync(
    'INSERT OR REPLACE INTO pose_data (session_id, frames, frame_count) VALUES (?, ?, ?)',
    [sessionId, blob, frames.length]
  );
}

export async function loadPoseFrames(sessionId: string): Promise<PoseFrame[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ frames: Uint8Array; frame_count: number }>(
    'SELECT frames, frame_count FROM pose_data WHERE session_id = ?',
    [sessionId]
  );
  if (!row) return [];
  return msgpack.decode(Buffer.from(row.frames)) as PoseFrame[];
}
