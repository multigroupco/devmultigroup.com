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
| `links`         | linktree-style outbound links, with a `clicks` counter                   |
| `recordings`    | YouTube playlists (talks / bootcamp series)                              |
| `gallery_items` | photos — `image_url` (external or `/media/<key>`) or `image_key` (R2)    |
| `team_members`  | organizers/volunteers; `socials` is a JSON string                        |
| `social_posts`  | curated social embeds (no third-party API)                              |

Row shapes mirror this schema in [`src/lib/types.ts`](./src/lib/types.ts).

### Cached read layer — [`src/lib/content.ts`](./src/lib/content.ts)

The **only** thing public pages should call for content. Every export wraps a D1 query
in `cached(...)` (see below): `getSettings`/`getSetting`, `listEvents`, `getEvent`,
`featuredEvent` (the banner event = featured + soonest upcoming, with a fallback),
`listPosts`, `getPost`, `listLinks`, `listRecordings`, `listGallery`, `listTeam`,
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
| `/yt/<id>`                     | `yt/[id].ts`                               | Scrapes a YouTube **playlist** page (no Data API) for its first videoId, caches it in KV **7 days**, then 302s to the `i.ytimg.com` thumbnail. Used as a fallback recording cover. |
| `/blog/banner/<slug>.svg`      | `blog/banner/[slug].svg.ts`                | Generates a monochrome AMOLED SVG OG/cover banner (radial gradient + dot pattern + wrapped title) for posts with no cover image. |

`/yt/<id>` is wired in `RecordingCard.astro` (`/yt/${ytId}` when no cover) and the SVG
banner in `PostCard.astro` (`/blog/banner/${slug}.svg` when no cover).

## Admin & auth

- `/admin` is fronted by **Cloudflare Access** (Zero Trust) in production. Access
  injects the `Cf-Access-Authenticated-User-Email` header.
- [`src/middleware.ts`](./src/middleware.ts) reads that header into
  `Astro.locals.adminEmail` and acts as defence-in-depth: on any `/admin*` path, **no
  header + not dev → 403**. When `import.meta.env.DEV` is true the guard is **bypassed**
  and the user becomes `dev@localhost`, so admin is freely usable in local dev.
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
- Sign-out links to `/cdn-cgi/access/logout`. There are **no app-side passwords** by
  design.

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
```

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
- Keep copy **Turkish**; keep the **English motto** as-is.
