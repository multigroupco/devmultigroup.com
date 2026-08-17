-- Partners, per-person team routes and the Gathin import key.
--
-- Three distinct ecosystem concepts now have three distinct tables — the
-- ambiguity 0006's header called out is finally resolved:
--   communities  = partner communities / chapters   (/communities)
--   companies    = employers our speakers came from (/companies)
--   partners     = ACTIVE collaborations            (/partnerships)   ← new here

-- ── partners (active collaborations) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  kicker       TEXT NOT NULL DEFAULT '',   -- "Android Workshop Serisi"
  lede         TEXT NOT NULL DEFAULT '',   -- one-paragraph teaser (index + hero)
  body_md      TEXT NOT NULL DEFAULT '',   -- long-form story (markdown)
  logo_url     TEXT NOT NULL DEFAULT '',   -- R2 key / path / external url
  hero_image   TEXT NOT NULL DEFAULT '',
  website      TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT '',   -- Android | Platform | AI …
  year_from    INTEGER,                    -- epoch secs, first collaboration
  -- json [{value,label}] — the animated counters on the partner page
  metrics_json TEXT NOT NULL DEFAULT '[]',
  -- json [{img,title,caption,href}] — the linked media grid
  gallery_json TEXT NOT NULL DEFAULT '[]',
  featured     INTEGER NOT NULL DEFAULT 0, -- lifts it into the index hero rail
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_partners_show ON partners (is_active, sort_order);

-- ── team: per-person public route (/team/<slug>) ────────────────────────────
-- Editing stays in /admin/team behind the existing Warden guard; there is no
-- self-service tier and no `member` role.
ALTER TABLE team_members ADD COLUMN slug TEXT NOT NULL DEFAULT '';
ALTER TABLE team_members ADD COLUMN long_bio TEXT NOT NULL DEFAULT '';
ALTER TABLE team_members ADD COLUMN focus TEXT NOT NULL DEFAULT '';
ALTER TABLE team_members ADD COLUMN joined_at INTEGER;
-- Partial index: existing rows all share slug='' until backfilled below, which
-- a plain UNIQUE would reject.
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_slug ON team_members (slug) WHERE slug <> '';

-- ── events: stable Gathin dedupe key ────────────────────────────────────────
-- The RSS <guid> ("togather-event-<id>"). The import is create-only, so this is
-- the column it checks before deciding a row is new.
ALTER TABLE events ADD COLUMN external_id TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external ON events (external_id) WHERE external_id <> '';

-- ── backfill: team slugs (slugify() applied ahead of time) ──────────────────
UPDATE team_members SET slug='serkan-alc' WHERE id='team-01' AND slug='';
UPDATE team_members SET slug='furkan-unsalan' WHERE id='team-02' AND slug='';
UPDATE team_members SET slug='batuhan-yalcin' WHERE id='team-03' AND slug='';
UPDATE team_members SET slug='zerrin-ayaz' WHERE id='team-04' AND slug='';
UPDATE team_members SET slug='alptug-gurler' WHERE id='team-05' AND slug='';
UPDATE team_members SET slug='azra-caliskan' WHERE id='team-06' AND slug='';
UPDATE team_members SET slug='mutlu-ozkurt' WHERE id='team-09' AND slug='';
UPDATE team_members SET slug='nuriye-dezcan' WHERE id='team-11' AND slug='';
UPDATE team_members SET slug='evren-ozkip' WHERE id='team-12' AND slug='';
UPDATE team_members SET slug='bilgihan-takim' WHERE id='team-13' AND slug='';
UPDATE team_members SET slug='burcu-aydin' WHERE id='team-14' AND slug='';
UPDATE team_members SET slug='hatice-rana-yamac' WHERE id='team-15' AND slug='';
UPDATE team_members SET slug='sarp-can-karaman' WHERE id='team-16' AND slug='';
UPDATE team_members SET slug='olivia-uzumcu' WHERE id='team-17' AND slug='';
UPDATE team_members SET slug='tamer-usta' WHERE id='team-18' AND slug='';
UPDATE team_members SET slug='koralp-selcuk' WHERE id='team-19' AND slug='';
UPDATE team_members SET slug='nurhan-uzun' WHERE id='team-20' AND slug='';
UPDATE team_members SET slug='selin-su-ozdemir' WHERE id='team-21' AND slug='';
UPDATE team_members SET slug='eray-keskinbas' WHERE id='team-22' AND slug='';
UPDATE team_members SET slug='asya-yayla' WHERE id='team-23' AND slug='';
UPDATE team_members SET slug='emirhan-kurt' WHERE id='team-24' AND slug='';
UPDATE team_members SET slug='ilgin-sel-balta' WHERE id='team-25' AND slug='';
UPDATE team_members SET slug='bilal-durnagol' WHERE id='team-27' AND slug='';
UPDATE team_members SET slug='selin-cildam' WHERE id='team-28' AND slug='';

-- ── #10: two members have left the team ─────────────────────────────────────
DELETE FROM team_members WHERE id IN ('team-08', 'team-10');
