-- Companies & speakers across the 6-year event archive.
--
-- `companies` here = organisations whose people have spoken at / been represented
-- at our events. This is a DIFFERENT concept from `communities` (partner
-- communities/chapters) and from the partnerships page (active collaborations).
-- `speakers` = everyone who has given a talk; `event_speakers` links them to the
-- seeded events (many-to-many).

CREATE TABLE IF NOT EXISTS companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  sector      TEXT NOT NULL DEFAULT 'Diğer',
  logo_url    TEXT NOT NULL DEFAULT '',   -- R2 key / path / external url (color logo, transparent bg)
  website     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  featured    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

CREATE TABLE IF NOT EXISTS speakers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL DEFAULT '',   -- role, e.g. "Senior iOS Engineer"
  company       TEXT NOT NULL DEFAULT '',   -- display company name (denormalised)
  company_id    TEXT,                        -- FK -> companies.id (nullable)
  bio           TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  socials       TEXT NOT NULL DEFAULT '',   -- json {linkedin,github,twitter,website,instagram}
  tags          TEXT NOT NULL DEFAULT '',   -- expertise tags, csv
  talks         TEXT NOT NULL DEFAULT '',   -- json [{event,date,slug|null}] full archive
  talk_count    INTEGER NOT NULL DEFAULT 0,
  first_talk_at INTEGER,                     -- epoch secs of earliest talk
  last_talk_at  INTEGER,                     -- epoch secs of latest talk
  featured      INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_speakers_active ON speakers(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_speakers_company ON speakers(company_id);

CREATE TABLE IF NOT EXISTS event_speakers (
  event_id    TEXT NOT NULL,
  speaker_id  TEXT NOT NULL,
  talk_title  TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'Konuşmacı',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (event_id, speaker_id)
);
CREATE INDEX IF NOT EXISTS idx_event_speakers_event ON event_speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_speaker ON event_speakers(speaker_id);
