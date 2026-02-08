CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY,
  note TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NULL,
  last_used_at INTEGER NULL,
  is_disabled INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_last_used_at ON tokens (last_used_at);
CREATE INDEX IF NOT EXISTS idx_tokens_is_disabled ON tokens (is_disabled);

CREATE TABLE IF NOT EXISTS token_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  note TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_logs_timestamp ON token_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_logs_token ON token_logs (token);
