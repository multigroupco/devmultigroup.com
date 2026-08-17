# CLAUDE.md

Guide for the next AI agent or developer working on this repo. Read this first, then
[`CODEMAP.md`](./CODEMAP.md) for the file-by-file map and
[`docs/GO-LIVE.md`](./docs/GO-LIVE.md) for the production cutover checklist.

## What this is

The **devmultigroup.com** community website for **Developer MultiGroup** — a Turkish
volunteer developer community (iOS/mobile, web, AI/GenAI, game dev, Web3, career) and
its learning arm **MultiAcademy** (free bootcamps). It is a fully server-rendered
(SSR) Astro site running on Cloudflare Workers, with **all content stored in D1** and
edited from a config-driven `/admin` behind Cloudflare Access — no redeploy is needed
to change content. The brand motto, kept in English, is **"Where Developers Become
Together."** All UI and content copy is otherwise **Turkish**.

## Architecture

- **Astro 5 SSR on Cloudflare Workers** via `@astrojs/cloudflare` v12 (the adapter).
  Config in [`astro.config.mjs`](./astro.config.mjs): `output: "server"`,
  `adapter: cloudflare({ platformProxy: { enabled: true }, imageService: "compile" })`,
  `prefetch` enabled (viewport strategy), Tailwind v4 via the Vite plugin, and
  `site: "https://devmultigroup.com"`.
- **Pinned to Astro 5 / adapter 12 on purpose.** Astro 6 + adapter 13 had a broken
  binding-access path at build time (see `withastro/astro#15237`); on that combination
  `Astro.locals.runtime.env` did not reliably expose D1/KV/R2. **Do NOT bump Astro to 6
  (or the adapter to 13) without end-to-end re-testing of D1 reads** in both `astro dev`
  and a deployed Worker. The exact pins are in [`package.json`](./package.json):
  `astro 5.18.2`, `@astrojs/cloudflare 12.6.13`.
- **Bindings are reached via `Astro.locals.runtime.env`**, never imported. Always go
  through the helpers in [`src/lib/runtime.ts`](./src/lib/runtime.ts): `getEnv(locals)`
  (throws if env missing) or `tryEnv(locals)` (returns `null`). The `Env` interface is
  declared in [`src/env.d.ts`](./src/env.d.ts) with `DB` (D1), `CACHE` (KV), `MEDIA`
  (R2), and optional `SITE_URL` / `ADMIN_TOKEN`.
- **Local dev uses `platformProxy`**, which emulates the bindings against local Wrangler
  state under `.wrangler/state`. So `astro dev` talks to a *local* D1/KV/R2, and you must
  migrate + seed locally before content appears (see Local dev below).

## Data & content model

### D1 schema — [`migrations/0001_init.sql`](./migrations/0001_init.sql)

SQLite (D1). Timestamps are **unix epoch seconds (UTC)**; booleans are `0/1`. Tables:

| Table           | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `settings`      | key/value site config (title, tagline, GA4 id, GSC token, stat strings…) |
| `events`        | events for both communities; `is_featured` drives the site banner        |
| `posts`         | blog posts (markdown `body_md`, `status` draft/published, `featured`)    |
| `links`         | linktree-style outbound links (`/links`), with a `clicks` counter        |
| `academy_links` | same shape as `links`, for the MultiAcademy linktree (`/academy-links`)  |
| `hero_slides`   | the photo bands flowing behind the homepage hero (admin-managed)        |
| `recordings`    | YouTube playlists (talks / bootcamp series)                              |
| `gallery_items` | photos — `image_url` (external or `/media/<key>`) or `image_key` (R2)    |
| `team_members`  | organizers/volunteers; `socials` is a JSON string, `slug` → `/team/<slug>` |
| `partners`      | **active collaborations** (`/partnerships`) — long-form, metrics/gallery JSON |
| `social_posts`  | curated social embeds (no third-party API)                              |

Row shapes mirror this schema in [`src/lib/types.ts`](./src/lib/types.ts).

### Cached read layer — [`src/lib/content.ts`](./src/lib/content.ts)

The **only** thing public pages should call for content. Every export wraps a D1 query
in `cached(...)` (see below): `getSettings`/`getSetting`, `listEvents`, `getEvent`,
`featuredEvent` (the banner event = featured + soonest upcoming, with a fallback),
`listPosts`, `getPost`, `listLinks`, `listRecordings`, `listGallery`, `listTeam`,
`getTeamMember`, `listPartners`, `getPartner`,
`listSocial`, and `getStats` (aggregate landing counts). Pages **never** write raw SQL.
Events use a 6-hour "grace" window (`GRACE`) so they read as upcoming until 6h after
start.

### Version-stamped KV cache — [`src/lib/cache.ts`](./src/lib/cache.ts)

A read-through cache over Workers KV. Every entry is keyed `c:<ns>:<version>:<key>`,
where `<version>` is an integer stored at `cv:<ns>`. **Invalidation bumps the version**
(`invalidate` / `invalidateMany`), which makes every old key unreachable at once — no
key enumeration, no purge API, and the first read after a write is guaranteed a miss
(hence fresh). Orphaned entries simply expire on their TTL (`DEFAULT_TTL = 600s`).
Namespaces live in `NS` (`settings`, `events`, `posts`, `links`, `recordings`,
`gallery`, `team`, `social`, `home`). With no `CACHE` binding (e.g. a bare test) the
loader runs straight through.

> **Important:** any **direct D1 SQL write** (e.g. a manual `wrangler d1 execute`, a
> seed, or a script) bypasses the admin layer and therefore does **not** bump the cache
> version. Reads can stay stale up to the TTL. After a direct write, bump the relevant
> `cv:<ns>` value manually (or just wait out the 600s TTL).

### Config-driven admin — [`src/lib/admin.ts`](./src/lib/admin.ts)

One registry, `RESOURCES`, drives list views, edit forms, and generic persistence:

- Each `Resource` declares `table`, `ns` (cache namespaces to invalidate on write),
  `fields` (typed `Field[]`), `listColumns`, and `defaultSort`. `Field.type` is one of
  `text | textarea | markdown | number | boolean | select | datetime | image | tags | color`.
- `saveRow(env, res, form)` — coerces form values per field type (`coerce`), resolves
  image uploads (a `<name>_file` File → R2 via `uploadImage`), auto-generates a `slug`
  if blank, **upserts** with `INSERT … ON CONFLICT(id) DO UPDATE`, then calls
  `invalidateMany(env, res.ns)`.
- `deleteRow(env, res, id)` — deletes and invalidates the same namespaces.
- `saveSettings(env, form)` — upserts each `SETTINGS_FIELDS` key/value, invalidates
  `settings` + `home`.
- Datetime fields convert between a `datetime-local` input and epoch seconds assuming a
  fixed **UTC+3** (`TR_OFFSET`, no DST) via `toLocalInput` / `fromLocalInput`.
- Image fields can be a full URL, an absolute path, or a bare R2 key; `imageSrc` in
  [`src/lib/ui.ts`](./src/lib/ui.ts) resolves bare keys to `/media/<key>`.

**Surfaces that used to be hardcoded and are now rows** (migration `0007`):

- `/admin/hero` → `hero_slides`, the photo marquee behind the homepage hero. `index.astro`
  falls back to the five static `main/main-N.jpg` paths only when the table comes back
  empty, so the hero can never render blank.
- `/admin/companies` → the `in_strip` flag ("Ana sayfa logo şeridi") picks which companies
  appear in `CompanyStrip`; `listStripCompanies` falls back to `featured=1`, then to the
  static `COMPANIES` const in `site.ts` if D1 is unreachable.
- `/admin/academy-links` → `academy_links`, the MultiAcademy linktree at `/academy-links`
  (`/links` stays MultiGroup). Same shape as `links`, so it reuses `LinkButton`, and
  `/go/<id>` looks in both tables when counting a click.
- `/admin/partners` → `partners`, driving both the `/partnerships` index and every
  `/partnerships/<slug>` page through **one** template. Adding a collaboration is a
  form, not a deploy — the accepted cost is that every partner page shares one
  silhouette.

**Three ecosystem concepts, three tables — do not conflate them:**
`communities` = partner communities/chapters · `companies` = employers our speakers
came from · `partners` = **active collaborations**. Migration `0006`'s header called
out the ambiguity; `0009` resolved it by giving the third one a table.

### Images & media (R2) — [`src/pages/media/[...key].ts`](./src/pages/media/[...key].ts)

**Content images are served from R2, not bundled as static assets.** The former
`public/{logos,main,partners,companies,ecosystems}` folders were migrated into the
R2 `MEDIA` bucket and are served by the `/media/<key>` route (immutable long-cache;
content-type comes from the object's `httpMetadata`, so it must be set at upload).
Keys mirror the old paths — `logos/<f>.png`, `main/main-N.jpg`, `partners/<f>.jpg`,
`companies/<f>.png`, `ecosystems/<f>.svg`.

- **Company logos** are DB-driven: `companies.logo_url` holds a **bare R2 key**
  (`logos/akbank.png`), which `imageSrc` resolves to `/media/logos/akbank.png`.
- **Code-referenced images** (landing hero in `index.astro`, `partnerships.astro`,
  `communities.astro`, featured-company marks in `site.ts`) use `/media/…` paths.
- **Only infra/brand images stay static** in `public/` — favicons, `apple-touch-icon`,
  `favicon-192/512`, `og-default.png`, the header/loader/word marks
  (`dmg-logo.webp`, `logo-small-*.png`, `multiacademy-*.png`), `turkey.svg` — plus
  `public/fonts/`. Browsers/crawlers/the manifest fetch these at fixed paths.
- **Uploading**: [`scripts/media-sync.sh`](./scripts/media-sync.sh) `remote|local`
  pushes the source content-image folders to R2 with correct content-types (used by
  the migration; run `remote` before deploying, `local` for `astro dev`). Ad-hoc
  images (event covers, admin uploads) go straight to R2 via `wrangler r2 object put`
  or the admin image pipeline. **Never add content images back to `public/`** — put
  them in R2 and reference the key. After a direct R2 + D1 write, bump `cv:<ns>`.

### Other lib helpers

- [`src/lib/db.ts`](./src/lib/db.ts) — D1 helpers `all` / `first` / `run`, plus `uuid`,
  `nowSec`, `slugify` (transliterates Turkish chars), `csv`, `bool`.
- [`src/lib/ui.ts`](./src/lib/ui.ts) — `imageSrc`, accent mapping (`categoryAccent`,
  `communityAccent`, `accentHex`, `accentSoft`), Turkish category labels
  (`categoryLabel`), YouTube URL/id helpers (`ytPlaylistUrl`, `ytEmbedPlaylist`,
  `ytPlaylistId`).
- [`src/lib/site.ts`](./src/lib/site.ts) — **single source of truth** for brand, nav,
  socials. `BRAND`, `NAV`, `FOOTER_NAV`, `GATHIN` (registration platform URLs),
  `JOIN_FORM` (the "Aramıza katıl" Google Form), `SOCIALS`, and `resolveSite(settings)`
  which merges DB settings over sane defaults.
- [`src/lib/format.ts`](./src/lib/format.ts) — date/time/number formatting in the
  `Europe/Istanbul` timezone (`formatDate`, `formatTime`, `formatDateTime`,
  `formatDayLabel`, `isUpcoming`, `iso`, `formatCount`).
- [`src/lib/markdown.ts`](./src/lib/markdown.ts) — `renderMarkdown` (trusted,
  admin-authored, via `marked`) and `excerptFrom`.
- [`src/lib/runtime.ts`](./src/lib/runtime.ts) — `getEnv`, `tryEnv`, `siteUrl`.

## Endpoints (server routes under `src/pages`)

| Route                          | File                                       | What it does                                                                                              |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `/sitemap.xml`                 | `sitemap.xml.ts`                           | Static pages + published events + published posts, with `lastmod`.                                        |
| `/robots.txt`                  | `robots.txt.ts`                            | Allows all (incl. GPTBot/ClaudeBot/PerplexityBot…), disallows `/admin` & `/go/`, links the sitemap.       |
| `/rss.xml`                     | `rss.xml.ts`                               | `@astrojs/rss` feed of up to 40 published posts (`language` tr-TR).                                        |
| `/llms.txt`                    | `llms.txt.ts`                              | GEO map for answer engines — concise, link-rich description of the site (facts pulled from settings).     |
| `/llms-full.txt`               | `llms-full.txt.ts`                         | Full-content GEO companion — community overview, MultiAcademy tracks, hard facts + latest posts, as markdown. |
| `/api/og`                      | `api/og.ts`                                | Dynamic 1200×630 PNG Open Graph card (AMOLED) via `workers-og` (Satori+resvg wasm). `?title=&eyebrow=`. Falls back to `/og-default.png`. |
| `/admin/upload`                | `admin/upload.ts`                          | Admin-only (behind Access) image upload to R2 for the markdown editor's paste/drag-drop. Returns `{url:"/media/…"}`. |
| `/site.webmanifest`            | `site.webmanifest.ts`                      | PWA manifest (name, icons, theme color `#0d0d0e`).                                                         |
| `/media/<key>`                 | `media/[...key].ts`                        | Streams an R2 `MEDIA` object with immutable long-cache headers; 404 if absent.                            |
| `/go/<id>`                     | `go/[id].ts`                               | Looks up an active link, increments `clicks` (via `ctx.waitUntil` when available), 302s to the URL.       |
| `POST /admin/events`           | `admin/[resource]/index.astro` (`action=sync-gathin`) | Pulls both Gathin RSS feeds (`src/lib/gathin.ts`) and inserts unseen `guid`s as **draft** events. Create-only; POST, never GET. |
| `/yt/<id>`                     | `yt/[id].ts`                               | Scrapes a YouTube **playlist** page (no Data API) for its first videoId, caches it in KV **7 days**, then 302s to the `i.ytimg.com` thumbnail. Used as a fallback recording cover. |
| `/blog/banner/<slug>.svg`      | `blog/banner/[slug].svg.ts`                | Generates a monochrome AMOLED SVG OG/cover banner (radial gradient + dot pattern + wrapped title) for posts with no cover image. |

`/yt/<id>` is wired in `RecordingCard.astro` (`/yt/${ytId}` when no cover) and the SVG
banner in `PostCard.astro` (`/blog/banner/${slug}.svg` when no cover).

## Admin & auth

- `/admin` is gated by **Warden** — the MultiGroup central OIDC identity provider (a
  separate app at `auth.devmultigroup.com`; source in the sibling `warden/` repo).
  **Cloudflare Access has been retired for `/admin`** (ADR
  [`docs/adr/0001-kunye-central-identity-provider.md`](./docs/adr/0001-kunye-central-identity-provider.md)).
- This app is an **OIDC relying party**: [`src/lib/oidc.ts`](./src/lib/oidc.ts)
  (`oauth4webapi`) + the routes [`src/pages/auth/login.ts`](./src/pages/auth/login.ts)
  (begin: PKCE/state/nonce → redirect to Warden), [`auth/callback.ts`](./src/pages/auth/callback.ts)
  (exchange code, verify ID token, persist identity), and [`auth/logout.ts`](./src/pages/auth/logout.ts).
  The federated identity (incl. the `role` claim) is stored in **this app's own session**
  (Astro KV `SESSION`) — OIDC federates *login*, not sessions.
- [`src/middleware.ts`](./src/middleware.ts) reads that session on `/admin*` and allows
  only roles in `ADMIN_ROLES` (`super-admin`/`admin`), populating `Astro.locals.adminEmail`
  (+ `adminRole`). Not signed in + not dev → **302 to `/auth/login`**. When
  `import.meta.env.DEV` is true the guard **falls back** to `dev@localhost` for content
  editing; hit `/auth/login` to exercise the real Warden flow locally.
- **Config:** `WARDEN_ISSUER` (must include the `/api/auth` base path), `WARDEN_CLIENT_ID`,
  `WARDEN_REDIRECT_URI` as vars; `WARDEN_CLIENT_SECRET` as a `wrangler secret`. The client is
  registered in Warden with `skip_consent` (first-party) + both the `*.workers.dev` and
  `localhost` redirect URIs.
- The same middleware also layers SEO/security concerns onto **every** response:
  baseline security headers (HSTS/nosniff/Referrer-Policy/X-Frame-Options/Permissions-Policy),
  a short `Cache-Control` for SSR HTML GETs, and — crucially — an **`X-Robots-Tag:
  noindex`** for any host other than `devmultigroup.com` (the `CANONICAL_HOST` const).
  This keeps the workers.dev staging URL and CF previews out of the search index while
  canonicals point at the apex; the guard self-disables once the apex serves this Worker.
  (Note: GA4 still fires on staging, so after cutover either exclude the workers.dev host
  with a GA4 filter or host-gate the tag.)
- The admin UI is generic: `/admin` (dashboard with counts), `/admin/[resource]`
  (list), `/admin/[resource]/[id]` (edit/new/delete; `id === "new"` is create), and
  `/admin/settings`. All driven by `RESOURCES` / `SETTINGS_FIELDS`. The shared form
  control is [`src/components/admin/Field.astro`](./src/components/admin/Field.astro).
  Below `md` the sidebar is a **hamburger drawer** (sticky topbar + backdrop, closes on
  Escape / backdrop / link tap); from `md` up it is the plain sticky sidebar. Its
  breakpoint rules live in the layout's own `<style>` (not Tailwind `md:hidden`) because
  Astro's scoped selectors out-specify single-class utilities and would beat them.
- **Sign-out is a POST form** to `/auth/logout` (clears the local session; Warden's own
  session is ended by the redirect that follows). It is POST **on purpose**: as a GET it
  was fetched by Astro's viewport prefetcher on every admin page load, which destroyed
  the session and bounced the admin through `/auth/login` on every navigation. A GET to
  `/auth/logout` now just redirects to `/admin`. App-side passwords live in **Warden**,
  not here — this app never sees them.

## Analytics & observability

Full tracking layer over **GA4 + PostHog + Sentry**, behind an **opt-in** consent
layer (KVKK K-005: no GA/PostHog before explicit consent; Sentry is essential —
errors only). Final legal texts are published as DRAFT pending lawyer review; see
[`docs/kvkk/ANALIZ.md`](./docs/kvkk/ANALIZ.md). See
[`docs/ANALYTICS.md`](./docs/ANALYTICS.md) for the complete map. Essentials:

- **Apex-only:** the whole layer (client + server) is inert unless the request
  host is `devmultigroup.com` (`BRAND.domain`). Staging `workers.dev`, CF previews,
  `www.*`, and localhost send nothing — it self-activates after the apex cutover.
  Gated in three places: `BaseLayout` (client), `captureServer` (server PostHog),
  `middleware` (server Sentry). This also retires the old "GA fires on staging" caveat.
- **One dispatcher:** `window.track(name, props)` (in
  [`src/components/Analytics.astro`](./src/components/Analytics.astro)) fans out to
  GA4 **and** PostHog. `window.dmgTrack` is a back-compat alias. Sentry only gets
  errors, never product events.
- **Emit via** `data-track="event"` (+ `data-track-props` JSON) on any element —
  one delegated listener handles it (and the legacy `data-ga`) — **or** call
  `window.track(...)` from an inline script. Cards (`EventCard`/`PostCard`/
  `RecordingCard`/`store/ProductCard`/`LinkButton`) self-instrument; pass a `page`
  (or `group`) context prop, don't add `data-track` to them.
- **Names** are the canonical `EVENTS` in [`src/lib/events.ts`](./src/lib/events.ts)
  (stable snake_case English; copy stays Turkish). SPA-aware: one `page_view` per
  `astro:page-load`.
- **Server capture** (no client render): `captureServer()` in
  [`src/lib/analytics-server.ts`](./src/lib/analytics-server.ts) → PostHog `/capture`
  via `ctx.waitUntil`, from `/go/[id]`, `/api/contact`, `/api/subscribe`,
  `/api/store/reserve`. Email is **only** a `distinct_id`, **SHA-256 hashed** before
  egress (K-011); raw IP is not forwarded.
- **Server errors:** [`src/middleware.ts`](./src/middleware.ts) wraps SSR and sends
  exceptions to Sentry via the dependency-free envelope sender in
  [`src/lib/sentry.ts`](./src/lib/sentry.ts) (DSN from `env.SENTRY_DSN`), then
  re-throws. No `@sentry/*` dependency — intentionally, to avoid wrapping the
  pinned adapter's generated worker.
- **Consent:** **opt-in** (K-005) — GA/PostHog load only after explicit consent;
  banner in [`src/components/ConsentBanner.astro`](./src/components/ConsentBanner.astro)
  (equal-weight actions + granular panel, default deny). Every decision is logged to
  D1 `consent_records` via `/api/consent-record` (m.11/m.12); a footer "Çerez
  Tercihleri" link withdraws consent. Sentry stays (essential, replay off).
- **Config:** browser keys (`ga_measurement_id`, `posthog_key`, `posthog_host`,
  `sentry_dsn`, `analytics_enabled`) in D1 `settings` via `resolveSite`; server
  keys (`SENTRY_DSN`, `POSTHOG_KEY/HOST`) in `wrangler.jsonc` vars (public ingest
  ids). Seed settings with `npm run analytics:settings:{local,remote}`.

### Staying inside both free tiers

Sentry and PostHog are on free plans whose limits are almost mirror images, so
each product owns the half the other is stingy about. **Sentry = system health**
(5k errors, 5 GB logs, 1 uptime + 1 cron monitor). **PostHog = product side**
(1M events, 5k session replays, 1M flag requests, 1500 survey responses, 100k
exceptions). Traffic is ~50 pageviews/month, so nothing is close to a limit —
the only real risk is a misconfiguration, and each one has a guard:

- **Error storms.** `captureServerException` gates every send on two KV counters:
  a 15-minute per-fingerprint cooldown and a hard monthly budget
  (`MONTHLY_BUDGET`, 2500). Both fail open — a KV outage must not silence
  reporting.
- **Browser errors.** Sentry's own client-key rate limiting is a **Business-plan
  feature**, so on free it silently does nothing (the API accepts the value and
  drops it). The equivalent lives in `Analytics.astro`'s `beforeSend`: at most 10
  events per rolling hour per browser, counted in localStorage.
- **Session replay.** On at 100% sampling, but recording is bound to the
  `session-replay` feature flag in PostHog — flip that flag off and recording
  stops instantly, no deploy. Inputs are masked, `/admin` is on the URL blocklist,
  sessions under 3s are dropped, retention 30 days.
- **Deliberately off:** Sentry tracing (would mean wrapping the pinned adapter's
  generated worker — see the pin warning above) and Sentry session replay (50/mo
  versus PostHog's 5000).

Reporting helpers in [`src/lib/sentry.ts`](./src/lib/sentry.ts), by call site:

| Helper | Use from | Notes |
| ------ | -------- | ----- |
| `reportError(locals, err, {area, request})` | pages / API routes that catch and keep serving | apex-only, `waitUntil` |
| `reportBackground(env, err, {area})` | library code with an `env` but no request | best-effort, `warning` level |
| `logEvent(locals, level, msg, attrs)` | audit-shaped moments (admin writes, sign-in) | Sentry Logs via OTLP |
| `captureServerException` / `captureServerLog` | anywhere holding a raw `Env` | the primitives the above wrap |

**Any `catch` that swallows an error to keep the page working must report.** That
was the bug class behind a silent OIDC failure, silent 502s on the contact and
newsletter forms, and a blank homepage during a D1 outage. Debug-level noise
belongs in Cloudflare Workers Logs (`observability` is on), not Sentry.

## Design system

The AMOLED monochrome theme lives entirely in
[`src/styles/global.css`](./src/styles/global.css) (Tailwind v4 `@theme` + layers):

- **True-black surfaces** (`--color-ink-950: #000`) with dense near-black panels.
- **White is the only accent.** The "accent family" (`violet`, `iris`, `cyan`, … in
  both CSS vars and `ACCENTS` in `types.ts`) is deliberately a set of near-white grays,
  so category differentiation reads as *tone, never colour*.
- Display/body/mono type: Space Grotesk / Inter / JetBrains Mono (Fontsource).
- Components: `.card`, `.btn`/`.btn-primary`/`.btn-ghost`, `.chip`, `.prose-dmg` (blog
  bodies), plus a `.skeleton` **shimmer** (used while images load), `.grain` film grain,
  animated background blobs, custom **scrollbar**, and reduced-motion handling.
- **Page transitions:** `<ClientRouter />` (Astro view transitions) is mounted in
  [`BaseLayout.astro`](./src/layouts/BaseLayout.astro). Because navigations are
  client-side, any inline interactivity (header scroll blur, banner dismissal, gallery
  lightbox) **re-initialises on `astro:page-load`** — follow that pattern for any new
  inline script.

## Content language

UI and content copy are **Turkish**. The only fixed English string is the brand motto
**"Where Developers Become Together"** (`BRAND.tagline` default; the seeded
`site_tagline` is the Turkish "Geliştiriciler birlikte gelişir", which `resolveSite`
overrides the default with). RSS declares `tr-TR`; OG locale is `tr_TR`. Keep new copy
Turkish.

## HOW-TO recipes

### (a) Add a new field to an existing content type

1. Add the column in a **new migration file** (`migrations/0002_*.sql`) — never edit
   `0001_init.sql`. Use a sensible `DEFAULT`.
2. Add the matching `Field` to that resource's `fields` in
   [`src/lib/admin.ts`](./src/lib/admin.ts) (pick the right `type`).
3. If pages should read it, extend the row interface in
   [`src/lib/types.ts`](./src/lib/types.ts).
4. Apply: `npm run db:migrate:local` (and `:remote` when deploying).

That's it — list view, edit form, persistence (`saveRow` upserts every field by name),
and cache-busting all follow automatically.

### (b) Add a whole new entity

1. New table in a new migration.
2. New row interface in `types.ts`.
3. A new `NS.<x>` namespace in `cache.ts`.
4. Cached read functions in `content.ts`.
5. A new entry in `RESOURCES` (with `ns: [NS.<x>, NS.home]` as appropriate). The admin
   list/edit/delete UI is automatic from there.
6. Public page(s) under `src/pages` that call your `content.ts` functions.

### (c) Where copy / nav / socials / the join form live

All in [`src/lib/site.ts`](./src/lib/site.ts): `BRAND`, `NAV`, `FOOTER_NAV`, `SOCIALS`,
`GATHIN` (event registration fallback URLs), and `JOIN_FORM` (used in `Header.astro`
and `team.astro`). Per-site overrides (title/tagline/description/GA4/GSC/stats) are
`settings` rows edited at `/admin/settings`.

### (d) Cache invalidation

Admin writes invalidate automatically (`saveRow`/`deleteRow`/`saveSettings` →
`invalidateMany`). **Direct D1 writes do not** — bump the relevant `cv:<ns>` KV value
manually, or wait out the 600s TTL. There is no purge endpoint and none is needed.

## Local dev & deploy

From [`package.json`](./package.json) scripts:

```bash
npm install
npm run db:migrate:local      # apply migrations to LOCAL D1 (.wrangler/state)
npm run db:seed:local         # load scripts/seed.sql locally
npm run dev                   # astro dev @ http://localhost:4321 (admin open in dev)

npm run build                 # astro build only
npm run deploy                # astro build + node scripts/postbuild.mjs + wrangler deploy
npm run db:migrate:remote     # migrations → remote D1
npm run db:seed:remote        # seed → remote D1

bash scripts/media-sync.sh remote   # push content images → remote R2 (see Images & media)
bash scripts/media-sync.sh local    # …and into local R2 for astro dev
```

> **Content images live in R2**, not `public/` (see [Images & media](#images--media-r2--srcpagesmediakeyts)).
> Local and remote R2 are separate stores — populate **both** (`media-sync.sh local`
> and `remote`), and remember prod reads remote R2 + remote D1 + remote KV: a data or
> image change only shows in prod after it's applied remotely (and `cv:<ns>` bumped).

> **`scripts/postbuild.mjs` is required.** The Cloudflare adapter writes
> `dist/_worker.js` and `dist/_routes.json`; deploying as a Worker-with-Assets,
> wrangler must **not** upload those as public assets. `postbuild.mjs` writes
> `dist/.assetsignore` listing them. Without it, **wrangler rejects `_worker.js`**.
> `npm run deploy` runs it explicitly (`astro build && node scripts/postbuild.mjs &&
> wrangler deploy`); there is also a `postbuild` npm lifecycle script that runs after
> `npm run build`. Either way, never deploy without `dist/.assetsignore` present.

## Cloudflare resources

Account `4d41dfaeb65887513d0440c9e42cb0b9` (config in
[`wrangler.jsonc`](./wrangler.jsonc)):

| Type   | Name / binding                            | ID / note                                              |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| Worker | `devmultigroup-web`                       | the site                                               |
| D1     | `devmultigroup-db` (binding `DB`)         | `849d67d6-c0e3-4de3-a241-d9b77fa28cd0`                 |
| KV     | `devmultigroup-cache` (bindings `CACHE` **and** `SESSION`) | `bfcc4b5e3680456ba38cdfcac35bad78` — `SESSION` reuses the same namespace for Astro's session store |
| R2     | `devmultigroup-media` (binding `MEDIA`)   | uploads bucket                                         |
| Access | app "MultiGroup Admin"                     | `87ff966f-92cf-4011-bd7e-cb569cc54b7c`                 |

The site is currently live on **workers.dev**
(`https://devmultigroup-web.multigroup-developmet.workers.dev`). The
**`devmultigroup.com` apex cutover is pending and user-controlled** — see
[`docs/GO-LIVE.md`](./docs/GO-LIVE.md) for the custom-domain switch plus GA4, Search
Console, and Access finalisation.

## Gotchas / do-not-touch

- **Do not upgrade Astro to 6 / adapter to 13** without re-testing D1 reads end to end
  (issue #15237). The current pins are load-bearing.
- **`platformProxy` runs with `remoteBindings: false`** (`astro.config.mjs`). Wrangler
  4.x otherwise opens a *remote* proxy session for the bindings with no local
  simulation (`AI`, `VECTORIZE`), and on this account that session cannot be created:
  it calls `GET /accounts/<id>/workers/subdomain/edge-preview`, which fails with
  "Could not create remote preview session on your account" and takes the entire dev
  server down before a route renders. This is an **account-level edge-preview
  subdomain problem, not a missing OAuth scope** — re-running `wrangler login` was
  tried and does not fix it (2026-08-17). Local-only is also what `wrangler.jsonc`
  already documents: VECTORIZE is absent in dev and search falls back to a D1 LIKE
  scan. Flipping this back before that account issue is resolved will break
  `astro dev`; production and `npm run deploy` are unaffected either way.
- **The Gathin import is create-only on purpose.** It will never update a row it has
  already imported, so a rescheduled or renamed event keeps its stale value **and says
  nothing**. That trade was made deliberately (see
  [`docs/grills/2026-08-17-open-issues-sweep.md`](./docs/grills/2026-08-17-open-issues-sweep.md))
  to protect hand-polished copy. Don't "fix" it into an upsert without revisiting it.
- **Do not delete or edit `scripts/postbuild.mjs`** or stop running it on deploy —
  `dist/.assetsignore` is mandatory.
- **Do not edit `migrations/0001_init.sql`** to add columns; add a new migration file.
- **Direct D1 writes** (manual SQL, seeds, scripts) **do not** invalidate the KV cache —
  bump `cv:<ns>` or wait the TTL.
- **Reach bindings only via `Astro.locals.runtime.env`** (through `getEnv`/`tryEnv`).
  Never import the env.
- **Pages must read through `lib/content.ts`**, not raw SQL, so reads stay cached.
- **`KV` namespace is shared** by `CACHE` and `SESSION` (same id) — session keys are
  namespaced separately; don't assume the namespace is cache-only.
- **Markdown is trusted** (admin-authored) and rendered unsanitised by `renderMarkdown`.
  Keep authoring behind Access.
- Datetime handling assumes **fixed UTC+3 (no DST)** — correct for Turkey, but don't
  reuse that assumption for other timezones.
- **Never give a side-effecting action a GET route.** `prefetch.prefetchAll` +
  `defaultStrategy: "viewport"` means the browser fetches every same-origin link that
  scrolls into view — a GET that logs out, deletes, or counts something will fire without
  a user. This already cost us a session-destroying `/auth/logout` (now POST-only) and
  inflated `/go/<id>` click counts (now `data-astro-prefetch="false"` on `LinkButton`).
  Use POST for state changes; add `data-astro-prefetch="false"` to any counted link.
- Keep copy **Turkish**; keep the **English motto** as-is.
- **Analytics is dependency-free** — no `@sentry/*` / `posthog-js` npm packages;
  client SDKs load via snippet/loader, server capture speaks the HTTP APIs
  directly. Don't add those deps (they'd risk wrapping the pinned adapter worker).
  Emit events through `window.track` / `data-track`, never a second pageview path.
  Seeding analytics settings is a direct D1 write → bump `cv:settings`/`cv:home`.
