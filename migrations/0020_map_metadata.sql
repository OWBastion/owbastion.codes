CREATE TABLE map_metadata (
  map_id TEXT PRIMARY KEY NOT NULL REFERENCES maps(id),
  difficulty_rating TEXT CHECK (difficulty_rating IN ('T0', 'T1', 'T2', 'T3', 'T4', 'T5')),
  mechanics_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
