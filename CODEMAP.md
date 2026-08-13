# CODEMAP.md

Annotated map of the repository. One line per meaningful file. See
[`CLAUDE.md`](./CLAUDE.md) for architecture and the why behind these.

```
devmultigroup.com/
├── astro.config.mjs              Astro 5 SSR config: cloudflare adapter (platformProxy on, imageService compile), Tailwind v4, prefetch (viewport), devToolbar off, site URL.
├── wrangler.jsonc                Worker config: bindings DB/MAIL_DB/STORE_DB (D1), CACHE+SESSION (KV), MEDIA/STORE_MEDIA (R2), ASSETS, AI (Workers AI), VECTORIZE; analytics/Sentry/AI-Gateway vars; observability.
├── package.json                  Pinned deps (astro 5.18.2, adapter 12.6.13, oauth4webapi, marked, workers-og) + dev/build/deploy, db:migrate/seed, analytics:settings, store:* scripts.
├── tsconfig.json                 Strict TS; `@/*` → `src/*` path alias; Cloudflare worker + astro/client types.
├── README.md                     Human-facing overview (stack, quickstart, content/admin model, deploy).
├── CLAUDE.md                     First-read guide for agents/devs (architecture, recipes, gotchas).
├── CODEMAP.md                    This file.
│
├── docs/
│   ├── GO-LIVE.md                Production cutover checklist: apex domain, GA4, Search Console, Access/auth finalisation.
│   ├── ANALYTICS.md              Tracking-layer guide: GA4 + PostHog + Sentry, event taxonomy, opt-in consent, server capture, config, go-live.
│   ├── adr/
│   │   └── 0001-kunye-central-identity-provider.md   ADR (Accepted): adopt Warden central OIDC IdP, retire Cloudflare Access on /admin.
│   ├── grills/
│   │   └── 2026-07-04-shared-auth-identity.md         Design "grill" session log behind the ADR (shared auth/identity for DMG + sibling apps).
│   ├── kvkk/
│   │   ├── ANALIZ.md             KVKK/GDPR compliance analysis (auto-generated; "AVUKAT GEREKEN" items flagged for lawyer review).
│   │   ├── KARARLAR.md           KVKK/privacy decision log (Q&A; the K-### decisions referenced across the code).
│   │   ├── UYGULAMA-PLANI.md     KVKK-analytics implementation plan (11 steps); LOCAL-only working doc.
│   │   └── taslaklar/
│   │       ├── aydinlatma-metni.md          DRAFT KVKK aydınlatma (privacy notice) text (pending lawyer + user approval).
│   │       ├── cerez-politikasi.md          DRAFT çerez (cookie) policy text.
│   │       └── eposta-bulten-onay-metni.md  DRAFT newsletter consent + notice text.
│   └── store/
│       ├── 00-RESEARCH-FINDINGS.md          Store Phase-1 research + ideas catalog (merch/e-commerce/edge-commerce lenses).
│       ├── 01-QUESTIONNAIRE.md              Store scoping decision questionnaire (with recommended defaults).
│       ├── 02-BETTER-AUTH-AND-CF-SETUP.md   Store build + Better Auth / Cloudflare provisioning guide (Phase-1 local).
│       ├── 03-MVP-EVENT-PICKUP-MODEL.md     Store MVP source-of-truth: "etkinlikten teslim" pre-order model.
│       └── 04-LOCAL-DEV.md                  Store local-dev guide + what's implemented.
│
├── migrations/                   ── content D1 (binding DB); never edit 0001, add a new file ──
│   ├── 0001_init.sql             Initial schema: settings, events, posts, links, recordings, gallery_items, team_members, social_posts (+ indexes).
│   ├── 0002_event_recordings.sql M2M join event_recordings (a playlist can cover many events, an event many recordings).
│   ├── 0002_resources.sql        `resources` table — curated open-source repos shown on /kaynakca.
│   ├── 0002_team_active_area.sql Adds team_members.team (active area / squad, separate from the `role` membership title).
│   ├── 0003_communities.sql      `communities` table — partner ecosystem chapters/clubs (Google/Huawei/Amazon/IEEE/Independent).
│   ├── 0003_recording_duration.sql  Adds recordings.duration_minutes (playlist/video total minutes).
│   ├── 0004_post_author.sql      Adds posts.author_url + author_title (richer byline: profile link + role).
│   ├── 0005_kvkk_consent_audit.sql  consent_records + erasure_log audit tables (no PII: UA hashed, IP 0.0.0.0); direct-write, uncached.
│   └── 0006_speakers_companies.sql  companies, speakers, event_speakers (M2M) across the 6-year event archive.
│
├── migrations-store/             ── store D1 (binding STORE_DB) ──
│   ├── 0001_store_init.sql       Store schema: drops (legacy), products, product_variants, orders, order_items, order_counters; money in kuruş.
│   └── 0002_consent_tracking.sql Adds orders.consent_at/consent_source/consent_channel (KVKK contract-basis processing stamp).
│
├── scripts/
│   ├── postbuild.mjs             Writes dist/.assetsignore (_worker.js, _routes.json) — REQUIRED or wrangler rejects the worker.
│   ├── media-sync.sh             Uploads public/ content-image folders (logos/main/partners/companies/ecosystems) into R2 MEDIA (remote|local), content-type per ext.
│   ├── seed.sql                  Idempotent Turkish core seed (settings, team, links, recordings, gallery, social…) from verified public sources.
│   ├── events.sql                GENERATED from gathin-events.json — the current Gathin community events (INSERT OR REPLACE).
│   ├── events-archive.sql        Past-event archive (~78 events; covers are R2 keys, incl. academy bootcamps).
│   ├── recordings-archive.sql    Recordings extracted from past-event videos + event↔recording links.
│   ├── recordings-durations.sql  Per-recording total minutes (UPDATE; scraped best-effort, editable in /admin).
│   ├── resources-seed.sql        Seed for /kaynakca — curated open-source repos under multigroupco (INSERT OR REPLACE).
│   ├── analytics-settings.sql    Upserts the browser-side analytics keys (posthog/sentry/master switch) into D1 settings.
│   ├── gen-events.mjs            Generates events.sql from gathin-events.json (mirrors every cover into R2).
│   ├── gathin-events.json        Source data: raw Gathin API dump of the MultiGroup community events.
│   ├── gathin-academy-events.json  Source data: raw Gathin API dump of the MultiAcademy events.
│   ├── gen-turkey.mjs            One-off: bakes public/turkey.svg + src/lib/turkey-map.ts city centroids from the Highcharts tr-all source.
│   ├── gen-speakers-companies.py Generates speakers-companies.sql from the data-intel workflow output + Excel records + seeded events.
│   ├── speakers-companies.sql    GENERATED: companies, speakers, event_speakers from the 6-year archive (do not hand-edit).
│   ├── apply-speaker-enrich.py   Merges speaker-enrichment JSON → speaker-enrich.sql (UPDATE only non-empty profile fields).
│   ├── speaker-enrich.sql        GENERATED speaker profile enrichment (title/bio/socials/avatar UPDATEs).
│   ├── apply-logo-research.sh    Downloads + normalises researched company logos → public/logos/<slug>.png + logo-research-update.sql.
│   ├── logo-research-update.sql  UPDATE companies.logo_url with researched logo paths.
│   ├── logo-mono-null.sql        Blanks logo_url for companies whose only logo isn't monochrome-friendly.
│   ├── store-seed.sql            Idempotent LOCAL store seed (products + variants; kuruş prices; product-focused, no drops).
│   └── store-seed-images.sh      Seeds LOCAL product photos into STORE_MEDIA R2 (Unsplash + SVG fallback) so the ASCII reveal is visible.
│
├── public/                       Static infra/brand assets only — content images now live in R2 (served via /media/<key>).
│   ├── fonts/                    Self-hosted Hanken Grotesk variable font (the logo wordmark typeface; @font-face in global.css).
│   ├── favicon.ico · favicon.png · favicon-192.png · favicon-512.png · apple-touch-icon.png   Favicons + PWA icons.
│   ├── dmg-logo.webp             MultiGroup wordmark logo (header/admin).
│   ├── logo-small-white.png · logo-small-black.png   Flower mark (header spin, page loader, ASCII-flower sampling).
│   ├── multiacademy-logo.png · multiacademy-mark-white.png   MultiAcademy logos.
│   ├── logo-wp-single.png · logo-wp-single(1).png   Single-colour brand lockups.
│   ├── og-default.png            Fallback Open Graph share card (used if /api/og render fails).
│   └── turkey.svg                Monochrome Türkiye provinces map (base image for the communities map).
│
└── src/
    ├── env.d.ts                  `Env` bindings interface (DB/MAIL_DB/STORE_DB, CACHE, MEDIA/STORE_MEDIA, ASSETS, AI, VECTORIZE, Sentry/PostHog/Warden/Resend) + App.Locals (adminEmail/adminRole) + SessionData (auth, oidc_tx).
    ├── middleware.ts             Gates /admin via the Warden OIDC session role (ADMIN_ROLES; dev falls back to dev@localhost); wraps SSR to Sentry; adds security headers, apex-only X-Robots noindex, short edge cache for HTML.
    │
    ├── layouts/
    │   ├── BaseLayout.astro      Public shell: Seo + Analytics + JsonLd (Organization/Breadcrumb), ClientRouter, PageLoader, SiteBackground, EventBanner, Header/Footer, ContactModal, SearchPalette, ConsentBanner; img-reveal script.
    │   └── AdminLayout.astro     Admin shell: noindex, sidebar nav from RESOURCES + Mağaza + Settings, View-site + Sign-out (POST form → /auth/logout), admin email; below md the nav is a hamburger drawer (topbar + backdrop, Escape/backdrop to close); no public chrome.
    │
    ├── styles/
    │   └── global.css            AMOLED monochrome design system (Tailwind v4 @theme + layers): true-black surfaces, white-only accent, Hanken @font-face, .card/.btn/.chip/.prose-dmg, skeleton shimmer, grain, marquee, custom scrollbar, motion.
    │
    ├── lib/                      ── DATA / DOMAIN LAYER ──
    │   ├── types.ts              Row interfaces mirroring the D1 schema (events/posts/links/academy links/hero slides/resources/recordings/gallery/team/social/community/company/speaker) + Community/AccentKey + ACCENTS palette.
    │   ├── db.ts                 D1 helpers all/first/run + uuid, nowSec, slugify (TR transliteration), csv, bool.
    │   ├── cache.ts              Version-stamped KV read-through cache: cached() (+shouldCache), invalidate/invalidateMany, NS namespaces (incl. search).
    │   ├── content.ts            Cached public read layer over D1 — the only content API pages call (events/posts/links/resources/recordings/gallery/team/communities/companies/speakers/social/settings/stats + pagination).
    │   ├── admin.ts              Config-driven admin: RESOURCES registry (+ searchable→Vectorize), SETTINGS_FIELDS, saveRow/deleteRow/saveSettings, uploadImage (R2), coercion, datetime↔epoch (UTC+3).
    │   ├── site.ts               Single source of truth: BRAND, CANONICAL_HOST/isApexHost, NAV/FOOTER_NAV/LEGAL_NAV, COMPANIES (R2 logos), GATHIN, JOIN_FORM, SOCIALS, SUBBRANDS, resolveSite(settings).
    │   ├── ui.ts                 imageSrc (bare R2 key → /media), category/community accent mapping, Turkish category labels, YouTube url/id helpers.
    │   ├── format.ts             Date/time/number formatting in Europe/Istanbul (formatDate/Time/DateTime/DayLabel, isUpcoming, iso, formatCount).
    │   ├── markdown.ts           renderMarkdown (trusted, via marked; auto-embeds bare YouTube links) + excerptFrom plain-text extractor.
    │   ├── search.ts             Site-wide semantic search — Workers AI (bge-m3) embeddings + Vectorize; per-type config, index/unindex/reindexAll, and a D1 LIKE fallback when AI/Vectorize is absent.
    │   ├── turkey-map.ts         Generated Türkiye viewBox + city-centre XY coordinates (used by CommunitiesMap); produced by scripts/gen-turkey.mjs.
    │   ├── events.ts             Canonical analytics event-name taxonomy (EVENTS) — single source of truth for client + server.
    │   ├── analytics-server.ts   Server-side PostHog /capture (captureServer): apex-only, fail-closed; email distinct_id is SHA-256 hashed (K-011), IP forced to 0.0.0.0.
    │   ├── sentry.ts             Dependency-free Sentry envelope sender for Worker SSR errors (parseDsn, captureServerException); DSN from env, never D1.
    │   ├── oidc.ts               Warden OIDC relying-party client (oauth4webapi): discover, beginLogin (PKCE/state/nonce), completeLogin (verify ID token → identity + role), ADMIN_ROLES.
    │   ├── runtime.ts            getEnv/tryEnv (read Astro.locals.runtime.env) + siteUrl.
    │   └── store/               ── store domain (STORE_DB / STORE_MEDIA) ──
    │       ├── types.ts          Store row shapes (drop/product/variant/order/order_item) mirroring migrations-store; money in kuruş, status enums.
    │       ├── config.ts         STORE constants (buyer-facing fulfilment note; drop/event-pickup model removed).
    │       ├── db.ts             Store D1 re-exports + SNS cache namespaces, parseImages (JSON/CSV→[]), storeImageSrc (bare key → /store/media/<key>).
    │       ├── catalog.ts        Cached public store reads over STORE_DB: listProducts/getProduct/getVariants (with computed remaining stock) + getStoreImpact.
    │       ├── orders.ts         Reservation + order lifecycle: reserve() (atomic ORD-YYYYMM-#### counter, dedupe, oversell guard, VAT), reads, advanceOrder (pay/deliver/cancel/reopen + restock).
    │       ├── admin.ts          Config-driven store admin (STORE_RESOURCES products+variants): optionsFrom dynamic selects, beforeSave hook (single image → images JSON), saveRow/deleteRow over STORE_DB/STORE_MEDIA.
    │       └── format.ts         Store formatting: money/amount (kuruş→₺, tr-TR), countdownParts; re-exports the Istanbul date helpers.
    │
    ├── components/               ── UI KIT ──
    │   ├── Header.astro          Sticky header (multigroup/academy/store brand variants): mark-spin/wordmark-collapse on scroll, nav + hover dropdowns, mobile drawer, search/newsletter/join CTAs; re-inits on astro:page-load.
    │   ├── Footer.astro          Footer: AsciiFlower, MultiGroup links/socials, sub-brand column (SUBBRANDS), legal nav + "Çerez Tercihleri" (data-consent-open), copyright/motto.
    │   ├── EventBanner.astro     Dismissable sticky upcoming-event banner (green), Gathin register CTA, mobile marquee; dismissal persisted in localStorage, re-binds on astro:page-load.
    │   ├── EventCard.astro       Event card: cover + date badge, summary, date/place, conditional register CTA; self-instruments (event_card_click / event_register_click).
    │   ├── EventDetail.astro     Shared event detail body for /events/[slug] + /academy/[slug]: chips, meta, cover, markdown, register CTA, speakers, recordings, related; emits Event JSON-LD.
    │   ├── PostCard.astro        Blog card (+ featured variant): cover (falls back to /blog/banner/<slug>.svg), title/excerpt, author/date/reading-time; emits blog_post_click.
    │   ├── RecordingCard.astro   Playlist card: thumbnail (cover or /yt/<id> fallback), play overlay, video count; emits recording_play.
    │   ├── SpeakerCard.astro     Speaker card: avatar/initials, title, company logo/name, talk-count or event-role chip, social links; carries data-q/company/sector for client filtering.
    │   ├── TeamCard.astro        Member card: avatar/initials, name, role, active area, social icons; whole card links to the primary profile (LinkedIn first).
    │   ├── LinkButton.astro      Link card routing through /go/<id> for click counting; icon + label + description + arrow; emits link_click. data-astro-prefetch="false" so the viewport prefetcher can't inflate the counter.
    │   ├── GalleryGrid.astro     Masonry photo grid with load skeletons + lightbox modal (Escape/click; re-binds on astro:page-load).
    │   ├── CommunitiesMap.astro  Türkiye map of partner communities: sized city dots (counts), animated hub-and-spoke connection arcs, hover tooltips (uses turkey.svg + turkey-map).
    │   ├── CompanyStrip.astro    Infinite marquee of company logos, admin-picked (companies.in_strip → listStripCompanies, falls back to featured then the static COMPANIES), forward/reverse, pause on hover.
    │   ├── ImpactStrip.astro     Scroll-revealed KPI strip with a digit "odometer" roll; SSR renders final values (correct with JS off).
    │   ├── AsciiFlower.astro     Rotating 3D ASCII flower brand mark (donut.c-style, drag-to-spin with inertia, off-screen pause, reduced-motion static); samples logo-small-white.png.
    │   ├── ContactModal.astro    Multi-purpose modal (partner/sponsor/support/newsletter): posts to /api/contact or /api/subscribe, honeypot, success confetti; fires generate_lead / newsletter_signup.
    │   ├── SearchPalette.astro   ⌘K/"/" command-palette querying /api/search (debounced, grouped, keyboard nav); fires search_open/submit/result_click.
    │   ├── SectionHeader.astro   Section heading with optional description and "View all" link; left/center alignment.
    │   ├── Stat.astro            Big-number + label stat with gradient text.
    │   ├── Icon.astro            Inline SVG icon set (filled brand glyphs + stroked UI icons), currentColor-driven.
    │   ├── SiteBackground.astro  Fixed full-screen backdrop: animated blur blobs, film grain, vignette, top scrim (transition:persist).
    │   ├── PageLoader.astro      View-transition loading overlay: spinning flower mark + top progress bar (astro:before-preparation → page-load; transition:persist).
    │   ├── Seo.astro             <head> SEO: title/description/canonical, robots, OG + Twitter cards (dynamic /api/og image), GSC verification meta.
    │   ├── Analytics.astro       Opt-in (KVKK K-005) analytics bootstrap: consent-gated GA4 + PostHog, essential Sentry loader; window.track() fans GA4+PostHog; delegated [data-track]/[data-ga]; one pageview per astro:page-load; logs consent to /api/consent-record.
    │   ├── ConsentBanner.astro   Opt-in KVKK/GDPR notice (hidden in body): equal-weight Reddet/Yönet/Kabul + granular panel (default deny); fallback open/save handler when the full analytics layer is inert.
    │   ├── JsonLd.astro          Emits a JSON-LD <script> from a passed schema.org object/array.
    │   ├── admin/
    │   │   └── Field.astro       Shared admin form control for every Field type (text/textarea/markdown/select/boolean/datetime/number/image/tags/color) + image preview and markdown paste/drag-drop upload to /admin/upload.
    │   └── store/
    │       ├── ProductCard.astro     Store product card: image (ASCII-reveal), category chip, sold-out/low badges, price, variant count; emits store_product_click.
    │       ├── AsciiReveal.astro     ASCII→photo reveal for store product images (coloured ASCII "encrypt" then crossfade to the real photo); same-origin R2 only, reduced-motion aware.
    │       ├── BinaryBackdrop.astro  Decorative scattered 0/1 code-rain texture behind store hero text (radial-masked).
    │       ├── ClaimBar.astro        Slim scarcity/stock meter — a thin line filling toward capacity ("reserved/capacity").
    │       ├── Countdown.astro       Renders a target time (data-countdown) with an Istanbul datetime label.
    │       ├── StoreComingSoon.astro Zero-state for /store when there are no products: large centered AsciiFlower + restrained copy + one CTA.
    │       ├── StoreSearch.astro     Compact client-side storefront search filtering the catalog grid by name/tagline/category.
    │       └── ValuesStrip.astro     De-commercialising values line (margin funds events · pickup at events · VAT included).
    │
    └── pages/                    ── ROUTES ──
        │   ── Public pages (BaseLayout) ──
        ├── index.astro           Home: hero (photo bands from hero_slides, static fallback), ImpactStrip stats, pillar cards, Academy/recordings/blog teasers, CompanyStrip, community map, join CTA; WebSite JSON-LD.
        ├── about.astro           About: mission, values cards, MultiAcademy card; reads stats/settings.
        ├── academy.astro         MultiAcademy: hero + value chips, programs, upcoming + past academy events, bootcamp recordings.
        ├── team.astro            Team: members grouped into named squads (Pioneer/Initiate/Veteran) via TeamCard, join CTA.
        ├── speakers.astro        Speakers directory: cards with client-side query + sector filter; talk/company tallies.
        ├── companies.astro       Companies (employers seen at events): sector filter rail + logo grid, per-company speaker counts.
        ├── communities.astro     Partner communities: CommunitiesMap + list; emits ItemList JSON-LD.
        ├── partnerships.astro    İş birlikleri: featured collaborations (Wite/Lodos sessions), CompanyStrip; ItemList JSON-LD.
        ├── kaynakca.astro        Curated open-source resources (/kaynakca), grouped (kaynakça/bootcamp/diğer) from the resources table.
        ├── links.astro           Linktree-style page: next-event card (16:9 cover) + grouped LinkButton links + socials.
        ├── academy-links.astro   MultiAcademy linktree: latest academy event (upcoming, else most recent past) + grouped academy_links + MultiAcademy socials.
        ├── 404.astro             Not-found page (noindex, no banner) with navigation buttons.
        ├── privacy.astro         KVKK aydınlatma metni (privacy notice) page.
        ├── privacy/
        │   ├── cerez-politikasi.astro   Çerez (cookie) policy page.
        │   └── bulten-onay.astro        Newsletter consent + notice page.
        ├── events/
        │   ├── index.astro       MultiGroup events list: upcoming + paginated past sections with a year filter.
        │   └── [slug].astro      MultiGroup event route → EventDetail (redirects academy events to /academy/<slug>; 404 when missing).
        ├── academy/
        │   └── [slug].astro      MultiAcademy event route → EventDetail (redirects MultiGroup events to /events/<slug>; 404 when missing).
        ├── blog/
        │   ├── index.astro       Blog list: category chips, deep-linkable ?q= filter, featured highlights + grid.
        │   ├── [slug].astro      Post detail: header, cover, markdown body (.prose-dmg), tags, related posts; emits BlogPosting JSON-LD.
        │   ├── tag/[tag].astro   Posts filtered by tag.
        │   └── banner/[slug].svg.ts  ENDPOINT: generated monochrome SVG cover/OG banner for posts lacking a cover image.
        ├── recordings/
        │   └── index.astro       Recordings: coverflow hero + full grid, YouTube channel link.
        ├── store/
        │   ├── index.astro       Storefront catalog: category filter, featured spotlight, product grid (StoreComingSoon zero-state); ASCII reveal + StoreSearch.
        │   ├── p/[slug].astro    Product detail: gallery, variants, price, reserve form (→ /api/store/reserve), fulfilment note.
        │   ├── ticket/[orderNo].astro   Reservation ticket/receipt (order status, items, totals); mirrors the GA4 conversion.
        │   └── media/[...key].ts        ENDPOINT: streams a STORE_MEDIA R2 object with immutable long-cache headers.
        │
        │   ── Admin (AdminLayout, Warden OIDC + role gate) ──
        ├── admin/
        │   ├── index.astro       Dashboard with per-resource item counts.
        │   ├── settings.astro    Edit site settings (GET form, POST → saveSettings).
        │   ├── upload.ts         Admin image upload to R2 MEDIA for the markdown editor; returns {ok,url:"/media/…"}.
        │   ├── [resource]/
        │   │   ├── index.astro   Generic list view for any RESOURCES entry.
        │   │   └── [id].astro    Generic create/edit/delete (id="new" → create; POST _action save/delete).
        │   ├── search/
        │   │   └── reindex.ts    Admin-gated Vectorize backfill (reindexAll); returns per-type counts (503 in local dev, no AI/Vectorize).
        │   └── store/
        │       ├── index.astro   Store dashboard: order queue + status actions (advanceOrder), impact strip, resource cards.
        │       ├── [resource]/
        │       │   ├── index.astro   Generic store list view (STORE_RESOURCES: products/variants).
        │       │   └── [id].astro    Generic store create/edit/delete (resolves dynamic select options).
        │       └── orders/[id].astro Order detail + lifecycle actions (pay/deliver/cancel/reopen).
        │
        │   ── Auth (Warden OIDC relying party) ──
        ├── auth/
        │   ├── login.ts          Begin OIDC login: mint PKCE/state/nonce, stash in session, redirect to Warden authorize.
        │   ├── callback.ts       OIDC callback: validate state, exchange code, verify ID token, persist identity (+role) in the app session.
        │   └── logout.ts         Full logout — POST ONLY (a GET here would be triggered by prefetch/link scanners): destroys the app session, then redirects to Warden /api/logout to end the SSO session. GET just bounces to /admin.
        │
        │   ── API (POST/JSON) ──
        ├── api/
        │   ├── og.ts             Dynamic 1200×630 Open Graph PNG (AMOLED) via workers-og (Satori+resvg); ?title=&eyebrow=; falls back to /og-default.png.
        │   ├── contact.ts        Contact form (partner/sponsor/support): honeypot + validation, sends via Resend, server-captures contact_submit (hashed email).
        │   ├── subscribe.ts      Newsletter signup → MAIL_DB contact list 1 (+ KVKK rıza kaydı), idempotent; captures newsletter_signup only for genuinely new subs.
        │   ├── consent-record.ts KVKK consent audit sink (m.11/m.12): logs each decision to D1 consent_records; stores no PII; always 200.
        │   ├── search.ts         GET /api/search?q=&type= → semantic (or LIKE) results, KV-cached under NS.search (non-empty only).
        │   ├── search/reindex.ts Token-guarded (Bearer ADMIN_TOKEN) Vectorize backfill for automation — same reindexAll as the admin route.
        │   └── store/reserve.ts  Public reservation POST → reserve(); server-captures success/error; 303 to the ticket or back to the product with an error.
        │
        │   ── Endpoints (.ts routes) ──
        ├── sitemap.xml.ts        Sitemap: static pages + published events + posts, with lastmod + image entries.
        ├── robots.txt.ts         robots.txt: allow all incl. named AI bots, disallow /admin /api/ /go/ /yt/, link the sitemap.
        ├── rss.xml.ts            RSS feed (tr-TR) of up to 40 recent published posts via @astrojs/rss.
        ├── llms.txt.ts           GEO index for answer engines — concise, link-rich site map with hard facts (from settings).
        ├── llms-full.txt.ts      GEO full-content companion — community overview, tracks, facts + latest posts as one markdown doc (live from D1).
        ├── site.webmanifest.ts   PWA web manifest JSON (name, icons, theme color #0d0d0e).
        ├── media/[...key].ts     Streams an R2 MEDIA object with immutable long-cache headers; 404 if absent.
        ├── go/[id].ts            Outbound link redirect + click counter for links and academy_links (waitUntil); server-mirrors link_redirect.
        └── yt/[id].ts            Scrapes a YouTube playlist's first-video thumbnail (no Data API), caches it in KV 7 days, 302s to the i.ytimg image.
```
