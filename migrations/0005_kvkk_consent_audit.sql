-- KVKK consent + erasure audit trail.
--   consent_records → m.11 (erişim/ispat) + Çerez Rehberi (rıza ispatı)
--   erasure_log     → m.7 (silme) + m.12 (silme ispatı)
--
-- Written by /api/consent-record (a DIRECT D1 write, outside the admin layer).
-- Neither table is read by the cached content layer (lib/content.ts), so these
-- writes need NO cv: cache bump. No PII is stored: the user-agent is kept only
-- as a SHA-256 hash and the IP is always '0.0.0.0'; erasure subjects are stored
-- as a SHA-256(email) hash so an erased person can't be re-identified here.

CREATE TABLE IF NOT EXISTS consent_records (
  id          TEXT PRIMARY KEY,
  session_id  TEXT,
  action      TEXT NOT NULL,                       -- 'opt-in' | 'opt-out' | 'banner_shown' | 'settings_change'
  categories  TEXT NOT NULL DEFAULT '[]',          -- JSON array, e.g. ["analytics","marketing"]
  source      TEXT NOT NULL DEFAULT 'web_banner',  -- 'web_banner' | 'footer_link' | 'email_form'
  channel     TEXT NOT NULL DEFAULT 'web',
  accepted    INTEGER NOT NULL DEFAULT 0,          -- 1 if any non-essential category was granted
  ua_hash     TEXT,                                -- SHA-256(user-agent); never the raw UA
  ip          TEXT NOT NULL DEFAULT '0.0.0.0',     -- intentionally never the real IP
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_consent_records_session ON consent_records (session_id, created_at);

CREATE TABLE IF NOT EXISTS erasure_log (
  id            TEXT PRIMARY KEY,
  subject_hash  TEXT NOT NULL,                          -- SHA-256(lower(email))
  status        TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'anonymized' | 'deleted'
  method        TEXT NOT NULL DEFAULT 'anonymize_plus_suppress',
  note          TEXT,
  requested_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_erasure_log_subject ON erasure_log (subject_hash);
