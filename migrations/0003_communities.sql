-- partner communities (ecosystem chapters/clubs MultiGroup works with)
CREATE TABLE IF NOT EXISTS communities (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  ecosystem  TEXT NOT NULL DEFAULT 'Independent', -- Google | Huawei | Amazon | IEEE | Independent
  city       TEXT NOT NULL DEFAULT '',
  logo_url   TEXT NOT NULL DEFAULT '',            -- R2 key / path / external url
  instagram  TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_communities_active ON communities(is_active, sort_order);
