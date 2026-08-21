-- Podcasts — a SHOW (a series), not an episode.
--
-- The fourth content lane on the site, alongside events / posts / recordings.
-- It is deliberately show-shaped: episodes ship weekly on the podcast
-- platforms, and mirroring every one of them into D1 would buy nothing the
-- platform feed does not already do. What lives here is the thing the
-- platforms cannot host — the pitch, the format, who it is for, and where to
-- subscribe. `/podcasts` lists shows; `/podcasts/<slug>` is one show,
-- long-form, through ONE template (same call as partners in 0009).
CREATE TABLE IF NOT EXISTS podcasts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,              -- "DataCast"
  show_name       TEXT NOT NULL DEFAULT '',   -- umbrella brand, e.g. "Dataly Hollows"
  kicker          TEXT NOT NULL DEFAULT '',   -- one-line promise (hero eyebrow line)
  lede            TEXT NOT NULL DEFAULT '',   -- one paragraph — index card AND page hero
  body_md         TEXT NOT NULL DEFAULT '',   -- long-form intro (markdown)
  cover_image     TEXT NOT NULL DEFAULT '',   -- R2 key / path / external url
  host            TEXT NOT NULL DEFAULT '',   -- "Zerrin Ayaz"
  host_slug       TEXT NOT NULL DEFAULT '',   -- team_members.slug → /team/<slug>
  schedule        TEXT NOT NULL DEFAULT '',   -- "Her Çarşamba 08.00"
  episode_length  TEXT NOT NULL DEFAULT '',   -- "25–30 dk"
  -- Platform links. Empty = not published there yet; the page hides the button
  -- and lists the platform as upcoming instead of shipping a dead link.
  spotify_url     TEXT NOT NULL DEFAULT '',
  apple_url       TEXT NOT NULL DEFAULT '',
  youtube_url     TEXT NOT NULL DEFAULT '',
  -- Where "get notified when an episode drops" points (a Gathin event).
  subscribe_url   TEXT NOT NULL DEFAULT '',
  -- json [{icon,title,text}] — "Bu seride seni neler bekliyor"
  highlights_json TEXT NOT NULL DEFAULT '[]',
  -- json [{icon,title,text}] — "Bu seri kimler için"
  audience_json   TEXT NOT NULL DEFAULT '[]',
  first_episode_at INTEGER,                   -- epoch secs — the pilot
  is_soon         INTEGER NOT NULL DEFAULT 0, -- before the pilot airs
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_podcasts_show ON podcasts (is_active, sort_order);
