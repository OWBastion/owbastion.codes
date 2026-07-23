CREATE TABLE content_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE content_draft_items (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL REFERENCES content_drafts(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('event', 'map', 'title', 'challenge')),
  content_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'retire', 'delete')),
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (draft_id, content_type, content_id)
);

CREATE TABLE content_change_sets (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL REFERENCES content_drafts(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'candidate', 'closed')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE content_change_set_items (
  id TEXT PRIMARY KEY NOT NULL,
  change_set_id TEXT NOT NULL REFERENCES content_change_sets(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('event', 'map', 'title', 'challenge')),
  content_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'retire', 'delete')),
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (change_set_id, content_type, content_id)
);

CREATE TABLE content_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  change_set_id TEXT NOT NULL REFERENCES content_change_sets(id),
  base_release_id TEXT,
  source_version TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('candidate', 'queued', 'running', 'succeeded', 'failed')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE content_releases (
  id TEXT PRIMARY KEY NOT NULL,
  candidate_id TEXT NOT NULL UNIQUE REFERENCES content_candidates(id),
  source_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'superseded')),
  bastion_commit_sha TEXT,
  artifact_refs_json TEXT NOT NULL DEFAULT '[]',
  diagnostics_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  activated_at INTEGER
);

CREATE TABLE content_build_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  release_id TEXT NOT NULL REFERENCES content_releases(id),
  candidate_id TEXT NOT NULL REFERENCES content_candidates(id),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  bastion_commit_sha TEXT,
  snapshot_hash TEXT NOT NULL,
  artifact_refs_json TEXT NOT NULL DEFAULT '[]',
  diagnostics_json TEXT NOT NULL DEFAULT '{}',
  request_hash TEXT NOT NULL,
  result_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE content_release_state (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'singleton'),
  current_release_id TEXT REFERENCES content_releases(id),
  next_candidate_id TEXT REFERENCES content_candidates(id),
  updated_at INTEGER NOT NULL
);

CREATE INDEX content_draft_items_draft_idx ON content_draft_items (draft_id, updated_at);
CREATE INDEX content_change_sets_draft_idx ON content_change_sets (draft_id, updated_at);
CREATE INDEX content_candidates_status_idx ON content_candidates (status, created_at);
CREATE INDEX content_build_tasks_status_idx ON content_build_tasks (status, updated_at);
