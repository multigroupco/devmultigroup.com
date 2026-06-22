# MultiGroup Store — Local Dev & What's Built

> Phase-1 MVP is **implemented and running locally**. Nothing here touches remote Cloudflare — the store DB/bucket are local placeholders emulated by `platformProxy` under `.wrangler/state`.

## Run it locally

```bash
# one-time: create the local store schema + seed (LOCAL only)
npm run store:schema:local         # applies migrations-store/0001_store_init.sql
npm run store:seed:local           # loads scripts/store-seed.sql (1 drop, 4 products, 8 variants)
npm run store:seed:images:local    # seeds local product photos into R2 (for the ASCII→image reveal)

# dev
npm run dev                        # http://localhost:4321
#   storefront → /store            admin → /admin/store  (admin open in dev)
```

**Storefront entrance** (`/store`): opens with a **search bar** (filters the catalog live; hides the spotlight/drop while searching), then a **featured-product spotlight**, then a **slim drop strip** (status · pickup · countdown · X/Y ayrıldı), then the **catalog grid** with category tabs. Product photos load with an **ASCII → image** reveal (`src/components/store/AsciiReveal.astro`; samples the same-origin R2 image to monochrome ASCII, then crossfades; `prefers-reduced-motion` shows the photo directly). Swap the seeded stand-in photos for real on-#000 product shots anytime via `/admin/store/products`.

Useful: `npm run store:reset:local` lists store tables. Re-running the seed (`store:seed:local`) resets seeded product/variant stock (idempotent on id).

> Note: direct D1 writes (the seed) don't bump the KV cache version, so if counters look stale, give it the 600s TTL or restart `npm run dev`. Admin writes invalidate automatically.

## What's built (event-pickup pre-order model — see [`03-…`](./03-MVP-EVENT-PICKUP-MODEL.md))

**Storefront** (`src/pages/store/`, native Astro SSR, reuses the AMOLED design system)
- `/store` — hero + `ImpactStrip` odometers (real counts) + active drop + category-as-tone filter + values strip.
- `/store/drops/[slug]` — drop page with claimed/remaining odometer + live countdown + pickup info + product grid.
- `/store/p/[slug]` — PDP: on-black gallery, mono datasheet (malzeme/kalıp/beden), button-style variant selectors (disabled-not-hidden, SSR radios), reserve form (name + email + qty).
- `/store/ticket/[orderNo]` — monochrome receipt = the pickup ticket (`ORD-YYYYMM-XXXX`).
- `/store/media/[...key]` — R2 (`STORE_MEDIA`) image streamer.
- `POST /api/store/reserve` — creates a reservation, redirects to the ticket.

**Reservation engine** (`src/lib/store/orders.ts`)
- Atomic `ORD-YYYYMM-XXXX` via a counter row + `RETURNING` (race-safe).
- Oversell guard (`UPDATE … WHERE stock >= ?`, checks rows-affected).
- Email dedupe (one active reservation per email per drop → returns the existing ticket).
- Server-computed totals; VAT (18%) shown as included; shipping = 0 (pickup).

**Admin** (`/admin/store/*`, behind the existing Cloudflare Access — no login built)
- Overview: "today" `ImpactStrip` (Bekleyen / Teslim bekliyor / Teslim edildi / Stok azaldı) + **pickup queue** with one-click `Ödendi` → `Teslim et`.
- Order detail: status pipeline (reserved → paid → delivered / cancelled), payment method (nakit/EFT), cancel restocks.
- Config-driven CRUD for **drops / products / variants** (reuses `Field.astro`; dynamic select options for drop/product/event; product image uploads to `STORE_MEDIA`).

**Data** — separate `STORE_DB` (D1) + `STORE_MEDIA` (R2), bound in `wrangler.jsonc` (local placeholder id). Schema in `migrations-store/0001_store_init.sql`: drops, products, product_variants, orders, order_items, order_counters. Money = INTEGER kuruş, ids = TEXT uuid, timestamps = `unixepoch()`, enums = `CHECK`, images = JSON-in-TEXT.

**Verified end-to-end locally:** storefront render · variant reserve · ticket · stock decrement · dedupe · oversell block · admin pay→deliver · admin create/delete + cache invalidation · main site (`/`, `/events`, `/admin`) unaffected · `npm run build` clean.

## Deferred to v1 (the "online store" upgrade — designed in [`02-…`](./02-BETTER-AUTH-AND-CF-SETUP.md))
Better Auth customer accounts · online prepay (iyzico/PayTR callback) · shipping + addresses + free-shipping odometer · email (Resend) order confirmations · reviews/badges · admin analytics tab (Sparkline.astro).

## Go-live (when you say so — not done in Phase 1)
1. `wrangler d1 create devmultigroup-store-db` → put the real `database_id` in `wrangler.jsonc` (replace the `5106c0de-…` placeholder).
2. `wrangler r2 bucket create devmultigroup-store-media`.
3. `npm run store:migrate:remote` (uses `migrations-store/`) + seed/import remote.
4. Add `/store` to `sitemap.xml.ts` / `robots.txt` as desired.
