ALTER TABLE player_accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE player_accounts ADD COLUMN banned_at INTEGER;
ALTER TABLE player_accounts ADD COLUMN banned_by TEXT;
ALTER TABLE player_accounts ADD COLUMN ban_reason TEXT;
