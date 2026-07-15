CREATE TABLE player_title_grants (
  id TEXT PRIMARY KEY NOT NULL,
  player_account_id TEXT NOT NULL REFERENCES player_accounts(id),
  historical_title_grant_id TEXT NOT NULL UNIQUE REFERENCES historical_title_grants(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  granted_by TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  revoked_by TEXT,
  revoked_at INTEGER,
  revoke_reason TEXT
);

CREATE INDEX player_title_grants_player_status_idx ON player_title_grants(player_account_id, status);
