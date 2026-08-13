-- Three admin-editable surfaces that used to be hardcoded in the source:
--   1. `hero_slides`  — the photo bands flowing behind the homepage hero
--                       (was the const `photos` array in src/pages/index.astro)
--   2. `academy_links`— the MultiAcademy linktree at /academy-links
--                       (mirrors `links`, which stays MultiGroup-only)
--   3. `companies.in_strip` — which companies appear in the homepage logo
--                       marquee (was the const COMPANIES in src/lib/site.ts)

-- ── homepage hero slides ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hero_slides (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',            -- admin-only label
  image_url    TEXT NOT NULL DEFAULT '',            -- R2 key / path / external url
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_hero_slides_show ON hero_slides (is_active, sort_order);

-- Seed with the five photos the hero shipped with, so the marquee is unchanged
-- until an admin edits it.
INSERT OR IGNORE INTO hero_slides (id, title, image_url, sort_order) VALUES
  ('hero-main-1', 'Topluluk 1', 'main/main-1.jpg', 1),
  ('hero-main-2', 'Topluluk 2', 'main/main-2.jpg', 2),
  ('hero-main-3', 'Topluluk 3', 'main/main-3.jpg', 3),
  ('hero-main-4', 'Topluluk 4', 'main/main-4.jpg', 4),
  ('hero-main-5', 'Topluluk 5', 'main/main-5.jpg', 5);

-- ── MultiAcademy linktree (/academy-links) ──────────────────────────────────
-- Same shape as `links` so LinkButton and /go/<id> work for both tables.
CREATE TABLE IF NOT EXISTS academy_links (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  icon         TEXT NOT NULL DEFAULT 'link',
  group_name   TEXT NOT NULL DEFAULT 'primary',
  accent       TEXT NOT NULL DEFAULT 'violet',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  clicks       INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_academy_links_show ON academy_links (is_active, group_name, sort_order);

INSERT OR IGNORE INTO academy_links (id, label, url, description, icon, group_name, accent, sort_order) VALUES
  ('al-academy',   'MultiAcademy',            'https://devmultigroup.com/academy',                    'Ücretsiz bootcamp''ler ve eğitim programları', 'sparkles',  'primary',   'iris',    1),
  ('al-events',    'Etkinlik takvimi',        'https://kommunity.com/devmultigroup',                  'Yaklaşan tüm etkinlikler',                     'calendar',  'primary',   'violet',  2),
  ('al-instagram', 'Instagram',               'https://www.instagram.com/devmultiacademy/',           '@devmultiacademy',                             'instagram', 'social',    'magenta', 3),
  ('al-linkedin',  'LinkedIn',                'https://www.linkedin.com/company/multiacademy-dev/',   'MultiAcademy',                                 'linkedin',  'social',    'cyan',    4),
  ('al-youtube',   'YouTube',                 'https://www.youtube.com/@devmultigroup',               'Ders ve etkinlik kayıtları',                   'youtube',   'social',    'coral',   5),
  ('al-recordings','Kayıtlar',                'https://devmultigroup.com/recordings',                 'Geçmiş oturumların video arşivi',              'play',      'resources', 'lime',    6),
  ('al-kaynakca',  'Kaynakça',                'https://devmultigroup.com/kaynakca',                   'Açık kaynak eğitim derlemeleri',               'book-open', 'resources', 'amber',   7),
  ('al-multigroup','Developer MultiGroup',    'https://devmultigroup.com/links',                      'Ana topluluk bağlantıları',                    'globe',     'links',     'violet',  8);

-- ── homepage company logo strip ─────────────────────────────────────────────
ALTER TABLE companies ADD COLUMN in_strip INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_companies_strip ON companies (in_strip, sort_order);

-- Start from the featured set (minus the logo-less rows) so the strip keeps
-- showing brand logos out of the box; admins tick/untick from /admin/companies.
UPDATE companies SET in_strip = 1 WHERE featured = 1 AND is_active = 1 AND logo_url <> '';
