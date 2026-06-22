# Analytics & Observability

The site runs **three** tools behind one consent-aware layer:

| Tool | Owns | Delivery |
| ---- | ---- | -------- |
| **Google Analytics 4** | Marketing / traffic + conversions | `gtag.js` (head, lazy) |
| **PostHog** | Product analytics, autocapture, web vitals, session replay, heatmaps | web snippet (US cloud) |
| **Sentry** | Error monitoring — browser **and** Worker SSR | JS Loader (browser) + dependency-free envelope (server) |

Division of labour: **GA4 = marketing**, **PostHog = product**, **Sentry = errors**.
Sentry is *not* a product-event destination; GA4/PostHog never receive errors.

## Apex-only activation

The **entire layer is inert unless the request host is `devmultigroup.com`**
(`BRAND.domain`). On the `workers.dev` staging URL, Cloudflare previews, `www.*`,
and localhost, no third-party script loads and no event (client or server) is sent.
So it only switches on once the apex serves this Worker — and staging traffic never
pollutes production analytics. Three gates, one host:

- **Client** — `BaseLayout.astro` computes `analyticsActive = analytics_enabled &&
  Astro.url.host === BRAND.domain` and passes it to `<Analytics enabled>`; the
  component renders nothing (no scripts, no `window.track`) when false.
- **Server PostHog** — `captureServer()` no-ops when the request host ≠ apex.
- **Server Sentry** — `middleware.ts` only captures when `host === CANONICAL_HOST`.

## The one dispatcher

Everything funnels through `window.track(name, props)` (defined in
[`src/components/Analytics.astro`](../src/components/Analytics.astro)), which fans
out to **both** GA4 (`gtag`) and PostHog (`posthog.capture`). `window.dmgTrack` is
a back-compat alias (it used to be GA-only). Two ways to emit:

1. **Declarative** — add `data-track="event_name"` (+ optional
   `data-track-props={JSON.stringify({…})}`) to any element. A single delegated
   document click listener fires `track()`. The legacy `data-ga` / `data-ga-params`
   attributes are still honoured by the same listener, so `track()` is a strict
   superset of the old GA wiring — nothing regressed.
2. **Programmatic** — call `window.track('event', {…})` from an inline script for
   JS-driven moments (search submit, modal open, banner dismiss, variant select).

SPA-aware: the site uses `<ClientRouter/>` view transitions. gtag's and PostHog's
auto-pageviews are disabled; exactly one `page_view` / `$pageview` fires per page
on every `astro:page-load` (initial load **and** each transition).

### Self-instrumenting components

`EventCard`, `PostCard`, `RecordingCard`, `store/ProductCard`, and `LinkButton`
emit their own click events from their root anchor, and accept an optional `page`
(LinkButton: `group`) context prop. **Don't** add `data-track` when rendering one —
just pass the context. This is why most pages only wire CTAs / nav / search.

## Event taxonomy

Canonical names live in [`src/lib/events.ts`](../src/lib/events.ts) (`EVENTS`).
Names are stable snake_case English; UI copy stays Turkish. Reuse a name with a
discriminating prop (`page` / `surface` / `location`) instead of minting a
near-duplicate. ~27 events; highlights:

- **Page/nav:** `page_view`, `nav_click`, `join_click`, `social_click`, `cta_click`
- **Search:** `search_open`, `search_submit` (surface: palette/blog/communities/store), `search_result_click`
- **Events:** `event_register_click`, `event_card_click`, `event_banner_dismiss`
- **Content:** `blog_post_click`, `blog_filter`, `recording_play`
- **Links:** `link_click` (client) + `link_redirect` (server, via /go/[id])
- **Lead/news:** `contact_modal_open`, `contact_submit` (server), `generate_lead` (GA4 conversion), `newsletter_signup`
- **Store:** `store_product_view`, `store_product_click`, `store_variant_select`, `store_reserve_submit`, `store_reserve_success` (server + GA4 mirror), `store_reserve_error`

Destinations: page-level + conversions → GA4 **and** PostHog; granular
product/funnel events → PostHog-first.

## Server-side capture

Routes with no client render capture straight from the Worker (fire-and-forget via
`ctx.waitUntil`), through [`src/lib/analytics-server.ts`](../src/lib/analytics-server.ts)
(`captureServer` → PostHog `/capture`):

- `/go/[id]` → `link_redirect`
- `/api/contact` → `contact_submit`
- `/api/subscribe` → `newsletter_signup` (only genuinely **new** subscribers)
- `/api/store/reserve` → `store_reserve_success` / `store_reserve_error`

Privacy rules baked in: **email is only ever a `distinct_id`, never a property
value**; form name/message are never sent; the visitor's raw IP is **not**
forwarded (`$ip: "0.0.0.0"`) because the consent decision is client-side only and
can't reach the Worker. `distinct_id` is read from the `ph_<key>_posthog` cookie
when present so server events stitch to the same PostHog person.

### Sentry server errors

[`src/middleware.ts`](../src/middleware.ts) wraps SSR rendering; any thrown
exception is sent to Sentry via [`src/lib/sentry.ts`](../src/lib/sentry.ts)
(a dependency-free implementation of Sentry's envelope protocol — we deliberately
avoid `@sentry/cloudflare`/`@sentry/astro` to not touch the pinned adapter's
generated worker) and re-thrown so Astro still renders its 500. Capture is skipped
in dev. DSN comes from `env.SENTRY_DSN` (never D1, so it survives a DB outage).

## Consent (KVKK / GDPR) — opt-out

[`src/components/ConsentBanner.astro`](../src/components/ConsentBanner.astro) is a
dismissible notice. Model:

- GA4 + PostHog load **by default** unless the visitor sends Do-Not-Track or has
  previously rejected (choice stored in `localStorage` as `dmg_consent`).
- **Reddet** (reject) disables GA (`ga-disable-<id>` flag) + `posthog.opt_out_capturing()`
  + stops session replay.
- **Sentry** loads regardless — error monitoring is treated as essential (no PII).
- Master switch `settings.analytics_enabled = "0"` turns **everything** off.

> Server-side captures are transactional (user-initiated conversions, no PII
> properties, no raw IP) and run under legitimate interest; they are not gated by
> the client consent flag because that flag never reaches the Worker.

## Configuration

**Browser-side keys** live in D1 `settings` (admin-editable at `/admin/settings`,
no redeploy), surfaced via `resolveSite()`:

| Setting | Purpose |
| ------- | ------- |
| `ga_measurement_id` | GA4 measurement id (`G-…`) |
| `posthog_key` / `posthog_host` | PostHog project key + ingest host |
| `sentry_dsn` | Sentry **browser** DSN |
| `analytics_enabled` | master on/off |

**Server-side keys** live in [`wrangler.jsonc`](../wrangler.jsonc) `vars` (all
PUBLIC ingest identifiers — they also ship in client HTML, so plain vars, not
secrets): `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `POSTHOG_KEY`, `POSTHOG_HOST`.

Seed the browser-side settings with `scripts/analytics-settings.sql`:

```bash
npm run analytics:settings:local     # dev
npm run analytics:settings:remote     # production (then bump cv:settings/cv:home or wait the TTL)
```

> A direct D1 write does **not** bump the KV cache version — see CLAUDE.md.

## Backend (already provisioned via MCP)

- **PostHog** (project *MultiGroup Web*, id 480740): dashboard
  *"MultiGroup Web — Product & Conversions"* (pinned) with Pageviews, Conversions,
  Store funnel, and Content-engagement insights; plus a launch annotation. Replay,
  web vitals, console logs, heatmaps are enabled project-side.
- **Sentry** (org `developer-multigroup`, project `devmultigroup-web`, EU region):
  receiving browser + server errors.
- **GA4**: mark the conversion events (`generate_lead`, `newsletter_signup`,
  `event_register_click`, `store_reserve_success`) as conversions in the GA4 UI —
  this can't be done over MCP (no GA MCP).

## Go-live

The layer is **apex-gated** (see above), so it self-activates the moment
`devmultigroup.com` points at this Worker — no staging filter needed. Steps:

1. `npm run analytics:settings:remote` (or set the four keys at `/admin/settings`),
   then bump `cv:settings`/`cv:home` or wait the ≤600s TTL.
2. Deploy the Worker (`npm run deploy`).
3. Point `devmultigroup.com` at the Worker (custom domain) — analytics turns on
   automatically once requests arrive on the apex host.
4. Mark GA4 conversions in the GA4 UI (no GA MCP).

## Known reporting caveat

`newsletter_signup` diverges by design: the client fires it to **GA4 only** (every
successful submit), the server fires it to **PostHog only** (gated on a genuinely
new subscriber). Don't reconcile the two counts 1:1 — GA4 is a superset.
