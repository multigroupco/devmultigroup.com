# devmultigroup.com

The community website for **Developer MultiGroup** — _Where Developers Become Together._

A fully server-rendered (SSR) site on **Astro 5 + Cloudflare Workers**. All content is
stored in **Cloudflare D1** and served through a version-stamped KV cache, edited from a
config-driven **`/admin`** behind **Cloudflare Access**. No redeploy is needed to change
content. UI and content are **Turkish**; the brand motto stays English.

> New here? Read **[CLAUDE.md](./CLAUDE.md)** (architecture, recipes, gotchas), then
> **[CODEMAP.md](./CODEMAP.md)** (file-by-file map). Production cutover steps are in
> **[docs/GO-LIVE.md](./docs/GO-LIVE.md)**.

## Features

- **Turkish content & UI** — all copy is Turkish; only the brand motto "Where Developers
  Become Together" is English.
- **D1-backed editable content** — events, blog, links, recordings, gallery, team and
  curated social posts all live in D1 and are read through a cached layer.
- **Config-driven admin behind Access** — one resource registry generates every list
  view, edit form and CRUD operation; `/admin` is protected by Cloudflare Access (no
  app-side passwords).
- **AMOLED monochrome design** — true-black surfaces, white-only accent, custom
  scrollbar, film grain, animated background.
- **Page transitions & skeleton loading** — Astro `ClientRouter` view transitions plus
  shimmer skeletons while images load.
- **Dynamic blog banners** — posts without a cover get a generated monochrome SVG OG
  banner at `/blog/banner/<slug>.svg`.
- **Live YouTube playlist thumbnails** — recording covers resolve via `/yt/<id>`, which
  scrapes a playlist's first-video thumbnail (no API) and caches it in KV for a week.
- **Full SEO / GEO** — sitemap, robots (AI bots welcomed), RSS, `llms.txt`, JSON-LD
  (Organization/Event/Article/WebSite), Open Graph + Twitter cards, and one-setting
  **GA4** + **Search Console** hooks.

## Stack

| Layer       | Choice                                                              |
| ----------- | ------------------------------------------------------------------ |
| Framework   | [Astro 5](https://astro.build) — `output: "server"`, full SSR      |
| Hosting     | Cloudflare Workers via `@astrojs/cloudflare` v12 adapter           |
| Data        | Cloudflare **D1** (`devmultigroup-db`)                              |
| Cache       | Cloudflare **KV** (`devmultigroup-cache`) — version-stamped         |
| Media       | Cloudflare **R2** (`devmultigroup-media`) — uploads                |
| Styling     | Tailwind CSS v4 + a hand-crafted AMOLED monochrome design system   |
| Admin auth  | Cloudflare **Access** (Zero Trust) in front of `/admin`            |

> **Why Astro 5 (not 6)?** Astro 6 + adapter 13 had a broken binding-access path
> (`withastro/astro#15237`) where `Astro.locals.runtime.env` did not reliably expose
> D1/KV/R2. Astro 5 + adapter 12 is rock-solid. **Don't upgrade without re-testing D1
> reads end to end.** Pins live in [`package.json`](./package.json).

## Project structure

```
src/
  components/      UI kit (cards, banner, icons) + admin/Field.astro
  layouts/         BaseLayout (public) · AdminLayout
  pages/           routes: public pages, /admin CRUD, and endpoints
    admin/         config-driven dashboard / [resource] / settings
    blog/ events/ … public sections (+ blog/banner SVG endpoint)
    sitemap robots rss llms webmanifest media go yt   endpoints
  lib/
    content.ts     cached public read layer (pages call these, never raw SQL)
    admin.ts       resource registry + persistence + cache invalidation
    cache.ts       version-stamped KV read-through cache
    db.ts types.ts site.ts ui.ts format.ts markdown.ts runtime.ts
  middleware.ts    reads Cf-Access-Authenticated-User-Email; guards /admin
  styles/global.css  AMOLED monochrome design system
migrations/0001_init.sql   D1 schema
scripts/postbuild.mjs      writes dist/.assetsignore (required for deploy)
scripts/seed.sql           seed data
```

See [CODEMAP.md](./CODEMAP.md) for the full annotated tree.

## Local development

```bash
npm install
npm run db:migrate:local      # apply schema to local D1
npm run db:seed:local         # load seed data locally
npm run dev                   # http://localhost:4321  (admin open in dev)
```

`astro dev` uses `platformProxy` to emulate D1/KV/R2 against local Wrangler state, so
migrate + seed locally before content appears. In dev the `/admin` Access guard is
bypassed (you become `dev@localhost`).

## Content & admin model

- Every public read goes through [`src/lib/content.ts`](./src/lib/content.ts), cached in
  KV under a per-type **version stamp**. Any admin write bumps that version
  ([`src/lib/cache.ts`](./src/lib/cache.ts)), so reads are fresh after an edit — no
  manual purges. **Direct D1 SQL writes do not invalidate the cache** — bump the
  relevant `cv:<ns>` value or wait the TTL.
- `/admin` is a config-driven CRUD over events, blog, links, recordings, gallery, team
  and social posts, plus **Settings**. To add a field: add a column in a **new
  migration** and an entry in the resource's `fields` in
  [`src/lib/admin.ts`](./src/lib/admin.ts) — list, form, persistence and cache-busting
  follow automatically.
- Image fields accept a full URL **or** a bare R2 key (served via `/media/<key>`).

## Deploy

```bash
npm run db:migrate:remote     # schema → remote D1 (first time / on schema change)
npm run db:seed:remote        # seed → remote D1 (first time / to re-seed)
npm run deploy                # astro build + scripts/postbuild.mjs + wrangler deploy
```

> `npm run deploy` runs `scripts/postbuild.mjs`, which writes `dist/.assetsignore`.
> This is **required** — without it wrangler rejects `_worker.js` as a public asset.

Currently live on workers.dev. The `devmultigroup.com` apex cutover is **pending and
user-controlled** — see **[docs/GO-LIVE.md](./docs/GO-LIVE.md)** for the custom-domain
switch plus Google Analytics, Search Console and Access finalisation.
