# CODEMAP.md

Annotated map of the repository. One line per meaningful file. See
[`CLAUDE.md`](./CLAUDE.md) for architecture and the why behind these.

```
devmultigroup.com/
├── astro.config.mjs              Astro 5 SSR config: cloudflare adapter (platformProxy on), Tailwind v4, prefetch, site URL.
├── wrangler.jsonc                Worker config: bindings DB(D1) / CACHE+SESSION(KV) / MEDIA(R2) / ASSETS; account, migrations dir, observability.
├── package.json                  Pinned deps (astro 5.18.2, @astrojs/cloudflare 12.6.13) + dev/build/deploy/db scripts.
├── tsconfig.json                 Strict TS; `@/*` → `src/*` path alias; Cloudflare worker types.
├── README.md                     Human-facing overview (stack, quickstart, deploy).
├── CLAUDE.md                     First-read guide for agents/devs (architecture, recipes, gotchas).
├── CODEMAP.md                    This file.
│
├── docs/
│   ├── GO-LIVE.md                Production cutover checklist: domain, Access, GA4, Search Console, content.
│   └── ANALYTICS.md              Tracking layer guide: GA4 + PostHog + Sentry, event taxonomy, consent, server capture, config, go-live.
│
├── migrations/
│   └── 0001_init.sql             D1 schema: settings, events, posts, links, recordings, gallery_items, team_members, social_posts (+indexes).
│
├── scripts/
│   ├── postbuild.mjs             Writes dist/.assetsignore (_worker.js, _routes.json) — REQUIRED or wrangler rejects the worker.
│   ├── seed.sql                  Idempotent Turkish seed data from verified public sources.
│   └── analytics-settings.sql    Upserts the browser-side analytics keys (posthog/sentry/master switch) into D1 settings.
│
├── public/                       Static assets: dmg-logo.webp, favicon.ico, og-default.png, brand logos.
│
└── src/
    ├── env.d.ts                  `Env` binding interface (DB/CACHE/MEDIA/SITE_URL/ADMIN_TOKEN) + App.Locals (adminEmail).
    ├── middleware.ts             Reads Cf-Access-Authenticated-User-Email → locals.adminEmail; guards /admin (403 in prod, bypass in dev).
    │
    ├── layouts/
    │   ├── BaseLayout.astro      Public shell: SEO + Analytics + JsonLd, ClientRouter transitions, SiteBackground, Header/Footer/EventBanner, org JSON-LD.
    │   └── AdminLayout.astro     Admin shell: noindex, sidebar nav built from RESOURCES, logout link; no public chrome.
    │
    ├── styles/
    │   └── global.css            AMOLED monochrome design system (Tailwind v4 @theme): true-black surfaces, white-only accent, cards/btns/chips, .prose-dmg, skeleton shimmer, grain, custom scrollbar, motion.
    │
    ├── lib/                      ── DATA LAYER ──
    │   ├── types.ts              Row interfaces mirroring the D1 schema + Community/AccentKey types + ACCENTS palette.
    │   ├── db.ts                 D1 helpers (all/first/run) + uuid, nowSec, slugify (TR transliteration), csv, bool.
    │   ├── cache.ts              Version-stamped KV read-through cache: cached(), invalidate(), invalidateMany(), NS namespaces.
    │   ├── content.ts            Cached public read layer over D1 — the only content API pages call (events/posts/links/recordings/gallery/team/social/settings/stats).
    │   ├── admin.ts              Config-driven admin: RESOURCES registry, SETTINGS_FIELDS, saveRow/deleteRow/saveSettings, uploadImage, coercion, datetime↔epoch.
    │   ├── site.ts               Single source of truth: BRAND, NAV, FOOTER_NAV, GATHIN, JOIN_FORM, SOCIALS, resolveSite(settings).
    │   ├── ui.ts                 imageSrc (R2 key → /media), category/community accent mapping, Turkish category labels, YouTube url/id helpers.
    │   ├── format.ts             Date/time/number formatting in Europe/Istanbul (formatDate/Time/DateTime/DayLabel, isUpcoming, iso, formatCount).
    │   ├── markdown.ts           renderMarkdown (trusted, via marked) + excerptFrom plain-text extractor.
    │   ├── events.ts             Canonical analytics event-name taxonomy (EVENTS) — single source of truth for client + server.
    │   ├── analytics-server.ts   Server-side PostHog /capture (captureServer) for redirect/form handlers; email is distinct_id only, no raw IP.
    │   ├── sentry.ts             Dependency-free Sentry envelope sender for Worker SSR errors (parseDsn, captureServerException); DSN from env.
    │   └── runtime.ts            getEnv/tryEnv (read Astro.locals.runtime.env) + siteUrl.
    │
    ├── components/               ── UI KIT ──
    │   ├── Header.astro          Sticky header: logo, nav with active underline, mobile drawer, scroll-blur (re-inits on astro:page-load); join CTA.
    │   ├── Footer.astro          Three-column footer: brand/socials, nav, MultiAcademy block.
    │   ├── EventBanner.astro     Dismissable sticky upcoming-event banner; dismissal persisted in localStorage, re-binds on astro:page-load.
    │   ├── EventCard.astro       Event card: date sidebar, category/academy chips, time/location, conditional Register button.
    │   ├── PostCard.astro        Blog card: cover (falls back to /blog/banner/<slug>.svg), title, excerpt, author, date, reading time.
    │   ├── RecordingCard.astro   Playlist card: thumbnail (cover or /yt/<id> fallback), play overlay, video count, category.
    │   ├── GalleryGrid.astro     Responsive masonry of gallery images with load skeletons + lightbox modal (Escape/click, astro:page-load).
    │   ├── TeamCard.astro        Member card: avatar/initials, name, role, bio, social icons parsed from socials JSON.
    │   ├── SocialCard.astro      Curated social-post card: thumbnail or fallback gradient + platform badge + caption.
    │   ├── LinkButton.astro      Link card routing through /go/<id> for click tracking; icon + label + description + arrow.
    │   ├── SectionHeader.astro   Section heading with optional description and "View all" link; left/center alignment.
    │   ├── Stat.astro            Big-number + label stat with gradient text.
    │   ├── Icon.astro            Inline SVG icon set (brand glyphs + stroked UI icons), currentColor.
    │   ├── SiteBackground.astro  Fixed full-screen backdrop: animated blur blobs, film grain, vignette (z -10).
    │   ├── Seo.astro             <head> SEO: title/description/canonical, robots, OG + Twitter cards, GSC verification meta.
    │   ├── Analytics.astro       Tracking-layer bootstrap (head): consent-gated GA4 + PostHog + Sentry browser; window.track() fans GA4+PostHog; delegated [data-track]/[data-ga] listener; one pageview per astro:page-load.
    │   ├── ConsentBanner.astro   Opt-out KVKK/GDPR notice (body, hidden); data-consent buttons toggled by the Analytics bootstrap.
    │   ├── JsonLd.astro          Emits a JSON-LD <script> from a passed schema.org object/array.
    │   └── admin/
    │       └── Field.astro       Shared admin form control rendering every Field type (text/textarea/markdown/select/boolean/datetime/number/image/tags/color) + image preview/upload.
    │
    └── pages/                    ── ROUTES ──
        │   ── Public pages (BaseLayout) ──
        ├── index.astro           Home: hero, stats, pillar cards, Academy teaser, recordings/blog/gallery/social teasers, join CTA; WebSite JSON-LD.
        ├── about.astro           About: mission, values cards, MultiAcademy card; reads stats/settings.
        ├── academy.astro         MultiAcademy: programs, upcoming academy events, bootcamp recordings, past programs.
        ├── team.astro            Team: MultiGroup + MultiAcademy member grids, join CTA.
        ├── links.astro           Linktree-style page (bare layout): grouped links, socials, logo/tagline.
        ├── 404.astro             Not-found page (noindex, no banner) with navigation buttons.
        ├── events/
        │   ├── index.astro       Events list with All/MultiGroup/Academy filter tabs; upcoming + past sections.
        │   └── [slug].astro      Event detail: chips, metadata, cover, markdown body, registration CTA, related events; Event JSON-LD.
        ├── blog/
        │   ├── index.astro       Blog list: tag chips, featured post, grid of posts.
        │   ├── [slug].astro      Post detail: header, cover, markdown body (.prose-dmg), tags, related posts; BlogPosting JSON-LD.
        │   ├── tag/[tag].astro   Posts filtered by tag.
        │   └── banner/[slug].svg.ts  ENDPOINT: generated monochrome SVG banner for posts lacking a cover image.
        ├── gallery/
        │   └── index.astro       Gallery with album filter tabs + GalleryGrid.
        ├── recordings/
        │   └── index.astro       Recordings grouped by category (event/bootcamp/talk/series/other) + channel link.
        │
        │   ── Admin (AdminLayout, behind Access) ──
        ├── admin/
        │   ├── index.astro       Dashboard with per-resource item counts.
        │   ├── settings.astro    Edit site settings (GET shows form, POST → saveSettings).
        │   └── [resource]/
        │       ├── index.astro   Generic list view for any RESOURCES entry.
        │       └── [id].astro    Generic create/edit/delete (id="new" → create; POST _action save/delete).
        │
        │   ── Endpoints (.ts routes) ──
        ├── sitemap.xml.ts        Sitemap: static pages + published events + posts with lastmod.
        ├── robots.txt.ts         robots.txt: allow all incl. AI bots, disallow /admin & /go/, link sitemap.
        ├── rss.xml.ts            RSS feed (tr-TR) of recent published posts via @astrojs/rss.
        ├── llms.txt.ts           GEO map for answer engines (link-rich site description).
        ├── site.webmanifest.ts   PWA web manifest JSON.
        ├── media/[...key].ts     Streams R2 MEDIA objects with immutable long-cache headers.
        ├── go/[id].ts            Outbound link redirect + click counter (waitUntil).
        └── yt/[id].ts            Scrapes a YouTube playlist's first-video thumbnail (no API), caches in KV 7 days, 302s to it.
```
