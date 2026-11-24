CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meeting_sessions (
    id TEXT PRIMARY KEY,
    time INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS meeting_sessions_time ON meeting_sessions(time);
