PRAGMA foreign_keys = OFF;

CREATE TABLE title_challenges_next (
  id TEXT PRIMARY KEY NOT NULL,
  title_key TEXT NOT NULL REFERENCES title_catalog(key),
  category_override TEXT,
  condition TEXT NOT NULL,
  evidence_rule TEXT NOT NULL,
  submission_mode TEXT NOT NULL CHECK (submission_mode IN ('manual', 'automatic')),
  game_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'sunsetting', 'retired')),
  introduced_version TEXT NOT NULL,
  retired_version TEXT,
  starts_at INTEGER,
  ends_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (title_key),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

INSERT INTO title_challenges_next (
  id, title_key, category_override, condition, evidence_rule, submission_mode,
  game_version, status, introduced_version, retired_version, created_at, updated_at
)
SELECT id, title_key, category_override, condition, evidence_rule, submission_mode,
  game_version, status, introduced_version, retired_version, created_at, updated_at
FROM title_challenges;

DROP TABLE title_challenges;
ALTER TABLE title_challenges_next RENAME TO title_challenges;
CREATE INDEX title_challenges_status_idx ON title_challenges(status, title_key);

PRAGMA foreign_keys = ON;
