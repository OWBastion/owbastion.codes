CREATE TABLE player_accounts_new (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  normalized_player_name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  banned_at INTEGER,
  banned_by TEXT,
  ban_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO player_accounts_new (id, player_id, player_name, normalized_player_name, is_admin, status, banned_at, banned_by, ban_reason, created_at, updated_at)
SELECT id, player_id, player_name, normalized_player_name, is_admin, status, banned_at, banned_by, ban_reason, created_at, updated_at
FROM player_accounts;

DROP TABLE player_accounts;
ALTER TABLE player_accounts_new RENAME TO player_accounts;
CREATE UNIQUE INDEX player_accounts_battletag_idx ON player_accounts(normalized_player_name, player_id);
