import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('formiq.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      recorded_at INTEGER NOT NULL,
      video_local_path TEXT,
      rep_count INTEGER DEFAULT 0,
      partial_rep_count INTEGER DEFAULT 0,
      form_score REAL,
      rating_score REAL,
      claude_feedback TEXT,
      duration_ms INTEGER,
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS pose_data (
      session_id TEXT PRIMARY KEY,
      frames BLOB NOT NULL,
      frame_count INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rep_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      rep_index INTEGER NOT NULL,
      start_timestamp_ms INTEGER,
      end_timestamp_ms INTEGER,
      form_score REAL,
      is_full_rep INTEGER,
      issues TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_recorded_at ON sessions(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rep_events_session ON rep_events(session_id);
  `);
}
