-- devmultigroup.com — resources (open-source content repos shown on /kaynakca)
-- D1 (SQLite). Timestamps are unix epoch SECONDS (UTC). Booleans are 0/1.

CREATE TABLE IF NOT EXISTS resources (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  url          TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'book-open',      -- icon key (Icon.astro)
  group_name   TEXT NOT NULL DEFAULT 'kaynakca',       -- kaynakca|bootcamp|diger
  lang         TEXT NOT NULL DEFAULT '',               -- optional language chip
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  is_soon      INTEGER NOT NULL DEFAULT 0,             -- shows a "yakında" badge
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_resources_show ON resources (is_active, group_name, sort_order);
