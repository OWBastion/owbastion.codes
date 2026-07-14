CREATE TABLE qq_group_access (
  group_open_id TEXT PRIMARY KEY NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('production', 'test')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX qq_group_access_environment_idx ON qq_group_access(environment);

CREATE TABLE qq_login_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'expired')),
  group_open_id TEXT,
  member_open_id TEXT,
  environment TEXT,
  message_id TEXT,
  session_token_hash TEXT,
  session_issued_at INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE UNIQUE INDEX qq_login_attempts_token_idx ON qq_login_attempts(token_hash);
CREATE INDEX qq_login_attempts_expiry_idx ON qq_login_attempts(expires_at, status);

CREATE TABLE qq_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES qq_login_attempts(id),
  group_open_id TEXT NOT NULL,
  member_open_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX qq_sessions_token_idx ON qq_sessions(token_hash);
