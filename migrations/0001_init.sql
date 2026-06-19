-- devmultigroup.com — initial schema
-- D1 (SQLite). Timestamps are unix epoch SECONDS (UTC). Booleans are 0/1.

-- ── site settings (key/value) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── events (multigroup + multiacademy) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  summary          TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',           -- markdown
  cover_image      TEXT NOT NULL DEFAULT '',
  community        TEXT NOT NULL DEFAULT 'multigroup', -- multigroup | multiacademy
  category         TEXT NOT NULL DEFAULT 'meetup',     -- meetup|workshop|bootcamp|talk|panel|hackathon
  location         TEXT NOT NULL DEFAULT '',
  city             TEXT NOT NULL DEFAULT '',
  is_online        INTEGER NOT NULL DEFAULT 0,
  starts_at        INTEGER,                            -- nullable for TBA
  ends_at          INTEGER,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  registration_url TEXT NOT NULL DEFAULT '',           -- gathin / kommunity link
  source           TEXT NOT NULL DEFAULT 'manual',     -- gathin|kommunity|manual
  status           TEXT NOT NULL DEFAULT 'published',  -- published | draft
  is_featured      INTEGER NOT NULL DEFAULT 0,         -- drives the "upcoming event" banner
  tags             TEXT NOT NULL DEFAULT '',           -- comma separated
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_events_when ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_browse ON events (community, status, starts_at);

-- ── blog posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL DEFAULT '',
  body_md          TEXT NOT NULL DEFAULT '',
  cover_image      TEXT NOT NULL DEFAULT '',
  author           TEXT NOT NULL DEFAULT 'MultiGroup',
  author_avatar    TEXT NOT NULL DEFAULT '',
  tags             TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'guides',
  reading_minutes  INTEGER NOT NULL DEFAULT 4,
  status           TEXT NOT NULL DEFAULT 'draft',      -- draft | published
  featured         INTEGER NOT NULL DEFAULT 0,
  published_at     INTEGER,
  seo_title        TEXT NOT NULL DEFAULT '',
  seo_description  TEXT NOT NULL DEFAULT '',
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts (status, published_at);

-- ── links (linktree replacement) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  icon         TEXT NOT NULL DEFAULT 'link',           -- icon key
  group_name   TEXT NOT NULL DEFAULT 'links',          -- primary|communities|social|resources
  accent       TEXT NOT NULL DEFAULT 'violet',         -- accent colour key
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  clicks       INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_links_show ON links (is_active, group_name, sort_order);

-- ── recordings (YouTube playlists) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recordings (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  youtube_url  TEXT NOT NULL DEFAULT '',
  playlist_id  TEXT NOT NULL DEFAULT '',
  cover_image  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT 'series',         -- event|bootcamp|talk|series
  video_count  INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_recordings_show ON recordings (is_active, sort_order);

-- ── gallery ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_items (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  caption      TEXT NOT NULL DEFAULT '',
  image_key    TEXT NOT NULL DEFAULT '',               -- R2 object key (if uploaded)
  image_url    TEXT NOT NULL DEFAULT '',               -- external url or /media/<key>
  album        TEXT NOT NULL DEFAULT 'community',
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  taken_at     INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_gallery_show ON gallery_items (is_active, album, sort_order);

-- ── team ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT '',
  bio          TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT NOT NULL DEFAULT '',
  community    TEXT NOT NULL DEFAULT 'multigroup',     -- multigroup|multiacademy|both
  socials      TEXT NOT NULL DEFAULT '{}',             -- json
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_team_show ON team_members (is_active, sort_order);

-- ── social posts (curated embeds — no third-party API needed) ───────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id           TEXT PRIMARY KEY,
  platform     TEXT NOT NULL DEFAULT 'instagram',      -- instagram|twitter|linkedin|youtube
  account      TEXT NOT NULL DEFAULT 'multigroup',     -- multigroup|multiacademy
  post_url     TEXT NOT NULL,
  embed_html   TEXT NOT NULL DEFAULT '',
  thumbnail    TEXT NOT NULL DEFAULT '',
  caption      TEXT NOT NULL DEFAULT '',
  posted_at    INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_social_show ON social_posts (is_active, platform, sort_order);
