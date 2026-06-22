-- Analytics layer config → D1 `settings` (the public, browser-side keys).
-- These drive the client bootstrap in src/components/Analytics.astro via
-- resolveSite(): PostHog (product analytics + replay + web vitals), the Sentry
-- browser DSN (client error monitoring), and the analytics master switch.
--
-- ga_measurement_id is intentionally NOT touched here — manage it on its own.
-- Server-side keys (SENTRY_DSN, POSTHOG_KEY/HOST) live in wrangler.jsonc vars.
--
-- NOTE: this is a DIRECT D1 write — it bypasses the admin layer and so does NOT
-- bump the KV cache version. After running against a live DB, bump cv:settings
-- and cv:home (or wait out the ≤600s TTL). See CLAUDE.md "Cache invalidation".
--
--   Local : npm run analytics:settings:local
--   Remote: npm run analytics:settings:remote
INSERT INTO settings (key, value, updated_at) VALUES
  ('posthog_key',       'phc_sGRQfYTzBZWsD2SHrFF45z54EvCSwcXYYWzUHMAUHCfv',                                              unixepoch()),
  ('posthog_host',      'https://us.i.posthog.com',                                                                     unixepoch()),
  ('sentry_dsn',        'https://2ac8e8503fb86d9f0a0c39857e6b600e@o4511607789584384.ingest.de.sentry.io/4511607888347216', unixepoch()),
  ('analytics_enabled', '1',                                                                                            unixepoch())
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
