# MultiGroup Store — Better Auth & Cloudflare Setup Guide

> The "what to build and what to set up" companion to [`00-RESEARCH-FINDINGS.md`](./00-RESEARCH-FINDINGS.md) and [`01-QUESTIONNAIRE.md`](./01-QUESTIONNAIRE.md).
> **Phase 1 is fully local.** Steps 1–11 below touch *nothing* remote. Step 12 is the explicit boundary where production provisioning begins — and we don't cross it until you say so.

> **⚑ Scope update (2026-06-21):** MVP is the **event-pickup pre-order model** in [`03-MVP-EVENT-PICKUP-MODEL.md`](./03-MVP-EVENT-PICKUP-MODEL.md) — so **§7 Payments and the shipping parts of §4/§6 are DEFERRED** (no PSP, no shipping at MVP; orders are `reserved/unpaid` and collected at events). Everything else here (native Astro integration, separate `STORE_DB`, R2 images, Better Auth, the local-first checklist) stands. The payment/shipping sections become the v1 "online store" upgrade path.

---

## 0. TL;DR

- **Integrate as a native Astro feature** inside the existing single `devmultigroup-web` Worker — re-implement perseva's pages as `.astro` SSR routes under `src/pages/store/**`. Drop Next.js/OpenNext entirely; port only the data + business logic.
- **Separate store database**: a second D1 `devmultigroup-store-db` bound as `STORE_DB`, holding Better Auth tables **and** all commerce tables (so order↔user joins work in raw SQL).
- **Auth split**:
  - **Customers** → **Better Auth** (email/password to start), sessions in `STORE_DB`.
  - **Store owner/admin** → **Cloudflare Access** (unchanged) — store admin lives under the existing Access-gated path, so **there is no admin login to build**.
- **Money** as INTEGER minor units (kuruş). **IDs** as TEXT UUIDs (`crypto.randomUUID`). **Timestamps** as INTEGER unix-seconds. **Arrays/JSON** as TEXT. **Enums** as TEXT + `CHECK`. (Matches `migrations/0001_init.sql` house style exactly.)
- **Payments**: hosted Turkish PSP (iyzico *or* PayTR) — token-init + HMAC-verified idempotent callback. No PCI surface, no client SDK.
- **Honour the load-bearing pins**: do **not** bump Astro past 5.18.2 / adapter past 12.6.13 (issue #15237 breaks `Astro.locals.runtime.env`, which `STORE_DB` access depends on).

---

## 1. What YOU need to provide / decide (human actions)

I can do all the code. These are the things only you can do — most are **not needed until late**, so none of them block starting locally.

| # | Action | When needed | Notes |
|---|---|---|---|
| H1 | Answer the 4 blocking questions (Q1, Q2, Q5, Q7 in the questionnaire) | **Before build starts** | Positioning, fulfillment, payment rail, shipping threshold |
| H2 | Decide who physically **packs & ships** orders (or the POD partner) | Before launch | The dominant real-world risk; see Q2 |
| H3 | Provide real **counter numbers** (members, cities, events…) | Before storefront polish | So the ImpactStrip isn't hollow (Q12) |
| H4 | Mascot/wordmark assets, if any; product photos on `#000` | During catalog build | Or we ship typographic-only naming first |
| H5 | Open a **PSP merchant account** (iyzico **or** PayTR) → get **sandbox** keys first, live keys later | Sandbox: mid-build · Live: before launch | Onboarding can take days — start early |
| H6 | Generate a `BETTER_AUTH_SECRET` (I'll show how) | When auth lands (v1) | 32+ random bytes |
| H7 | Approve crossing into **remote provisioning** (Step 12) | Go-live | Until then everything is `--local` |

You do **not** need: a new Cloudflare account, a Supabase migration on their side (we export/transform locally), Stripe (unavailable for TR entities), or any new SaaS.

---

## 2. Target architecture

```
devmultigroup-web (ONE Worker, ONE deploy — unchanged pipeline)
├─ src/pages/**                     existing site (untouched)
├─ src/pages/store/**               NEW public storefront (SSR .astro)
│   ├─ index.astro                  hero + ImpactStrip + collections
│   ├─ [category].astro             collection / category-as-tone
│   ├─ p/[slug].astro               PDP (button variant selectors, datasheet, fit line)
│   ├─ cart/*  checkout/*           cart drawer is global; checkout pages SSR
│   └─ media/[...key].ts            R2 image streamer (clone of /media/[...key].ts)
├─ src/pages/api/auth/[...all].ts   NEW Better Auth catch-all (customers)
├─ src/pages/api/store/**           cart add/update, checkout init, PSP callback
├─ src/pages/admin/store/**         NEW owner admin — behind EXISTING Cloudflare Access
├─ src/lib/store/                   ported business logic (cart math, VAT/shipping, order#)
│   ├─ db.ts                        thin wrappers passing env.STORE_DB (mirror src/lib/db.ts)
│   ├─ auth.ts                      createAuth(env) per-request factory
│   ├─ format.ts                    minor-units → "₺149,90", Istanbul dates
│   └─ ...
├─ migrations-store/                NEW store migrations (own dir + npm scripts)
│   ├─ 0001_store_init.sql
│   └─ 0002_auth.sql                Better Auth DDL (generated → hand-ported)
└─ wrangler.jsonc                   + STORE_DB (D1), + STORE_MEDIA (R2)

Bindings on the same Worker:
  DB (devmultigroup-db)         ← existing content, untouched
  MAIL_DB                       ← existing
  CACHE / SESSION (KV)          ← existing, reused for store catalog cache (new NS keys)
  MEDIA (R2)                    ← existing
  STORE_DB (devmultigroup-store-db, D1)   ← NEW: auth + commerce
  STORE_MEDIA (devmultigroup-store-media, R2) ← NEW (or reuse MEDIA under store/ prefix)
```

**Why native (not a 2nd Worker / iframe / Shopify):** one deploy, one `postbuild`/`.assetsignore`, one design system; the store inherits `ClientRouter` view transitions, the KV cache, `/media` serving, and the Access admin gate for free. A separate Worker would mean two stacks, fragile cross-Worker cookies/cart-merge, and the AMOLED components wouldn't transfer.

---

## 3. Better Auth setup (customers)

> Scope is deliberately small: Better Auth is for **customers only**. The store **owner** stays behind Cloudflare Access — so no admin login screen exists to build. Land this in **v1** (MVP is guest-checkout-first).

### 3.1 Adapter — honour the no-ORM house rule
Use Better Auth's **native Cloudflare D1 dialect** (Kysely-backed; e.g. via the `better-auth-cloudflare` integration / `d1` dialect), pointed at the `STORE_DB` binding. **Do not introduce Drizzle at runtime.** For schema, run `@better-auth/cli generate` (build-time only) and **hand-port the emitted DDL** into `migrations-store/0002_auth.sql`, adjusting to the repo convention (TEXT uuid ids, INTEGER `unixepoch()` timestamps, `0/1` booleans). Runtime stays raw-SQL native D1, exactly like the rest of the store.

### 3.2 Tables (created by the generated migration)
- **`user`** — `id` TEXT PK, `email`, `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`; **+ `role` TEXT DEFAULT 'customer'** (from the admin plugin).
- **`session`** — `id`, `userId`→user, `token`, `expiresAt`, `ipAddress`, `userAgent` (admin plugin adds `impersonatedBy`).
- **`account`** — `id`, `userId`, `providerId`, `accountId`, password hash for email/credential (+ tokens for future OAuth).
- **`verification`** — powers email-verify + future magic-link/OTP.
- Admin plugin also adds `banned`, `banReason`, `banExpires` to `user` (no extra table; single-org role model).

### 3.3 Plugins / config
- `emailAndPassword` (core config block) — mirrors today's Supabase email/password-only auth.
- `admin()` plugin — gives the `role` field + server APIs; this is the canonical replacement for the old `profiles.role === 'admin'` check **for the store's own customer/staff distinction**.
- **Not** the `organization` plugin (single-tenant community store doesn't need orgs).
- Deferred: `magicLink()` / `emailOTP()` — cheap to add later; `verification` table already supports them.

### 3.4 Role handling
`role` ('customer' | 'admin', default 'customer') lives on `user`. In middleware, after `auth.api.getSession({ headers })`, set `locals.user`; gate customer pages on `locals.user` existing. Note: store-**owner** ops are gated by Cloudflare Access, so `role==='admin'` is a *belt-and-suspenders* in-app check, not the primary gate. Seed the first admin by setting `role` directly in D1.

### 3.5 Sessions
**D1-only for v1** (the `session` table is the source of truth) — simplest, fully consistent, and a community-merch audience never reaches the read volume that would justify KV. **Do not** enable Better Auth `cookieCache` + KV `secondaryStorage` together yet (known fallback bug, BA #4203/#4557). If read volume ever justifies KV, add it read-through only with TTLs ≥ 60s and a **distinct key prefix/namespace** (the repo already shares one KV namespace for `CACHE`+`SESSION`).

### 3.6 Mount in Astro — the #1 gotcha
Build the auth instance with a **per-request factory** that reads bindings from `Astro.locals.runtime.env`. **Never** a module-level singleton (Workers bindings are per-request — a captured-at-import singleton is the single most common Better-Auth-on-Workers failure).

```ts
// src/lib/store/auth.ts
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
// + the Cloudflare D1 dialect import from your chosen integration

export function createAuth(env: Env) {
  return betterAuth({
    database: /* native D1 dialect wrapping env.STORE_DB */,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? env.SITE_URL ?? "https://devmultigroup.com",
    trustedOrigins: [
      "https://devmultigroup.com",
      "https://devmultigroup-web.multigroup-developmet.workers.dev", // pre-cutover staging
      "http://localhost:4321",
    ],
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    plugins: [admin()],
  });
}
```

```ts
// src/pages/api/auth/[...all].ts
import type { APIRoute } from "astro";
import { createAuth } from "../../../lib/store/auth";
import { getEnv } from "../../../lib/runtime"; // existing helper

export const ALL: APIRoute = ({ request, locals }) =>
  createAuth(getEnv(locals)).handler(request);
```

```ts
// in src/middleware.ts — add session resolution (Access /admin guard stays ABOVE this, untouched)
const auth = createAuth(getEnv(context.locals));
const session = await auth.api.getSession({ headers: context.request.headers });
context.locals.user = session?.user ?? null;
context.locals.session = session?.session ?? null;
```

### 3.7 Env / secrets
| Var | Where | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | `wrangler secret` (prod) / `.dev.vars` (local) | Signs session tokens/cookies; 32+ random bytes |
| `BETTER_AUTH_URL` / `SITE_URL` | `.dev.vars` / vars | Drives `baseURL` + trusted origins |
| `RESEND_API_KEY` | already a secret (contact form) | Reuse for verify / magic-link emails (Turkish templates) |
| (future) `GOOGLE_/GITHUB_CLIENT_ID/SECRET` | secrets | OAuth, deferred |

Generate the secret: `openssl rand -base64 32`.

### 3.8 Gotchas (read before wiring)
- **Per-request factory, not a singleton** (see 3.6).
- `trustedOrigins` **must** include the `*.workers.dev` staging URL pre-cutover, or auth calls 403 on Origin checks.
- Verify the D1 dialect writes **INTEGER epoch + 0/1**, not ISO-TEXT/true-false — otherwise auth tables diverge from commerce tables and joins/format helpers misbehave. Pin the encoding (add a thin mapping if needed).
- `@better-auth/cli generate` may not natively target D1/Kysely — generate against local sqlite, hand-port DDL, and **re-diff on every Better Auth version bump**.
- Same host (`devmultigroup.com`) for store + admin → default host-derived cookies are fine; no cross-subdomain config.

### 3.9 Cloudflare Access ↔ Better Auth boundary
Clean split, zero overlap:
- **Cloudflare Access** continues to gate `/admin*` (incl. store admin under `/admin/store/*`) exactly as today — middleware reads `Cf-Access-Authenticated-User-Email` and 403s without it. This is the **real gate for store-owner ops**.
- **Better Auth** governs **only** customer identity on public `/store` (login, my orders, addresses, member-gated drops). It never touches `/admin`.

---

## 4. Separate D1 + schema port (keep the shape, change the encoding)

**Create** a second D1 `devmultigroup-store-db` bound `STORE_DB`. Auth + all commerce tables co-locate there. Mirror `src/lib/db.ts` helpers but pass `env.STORE_DB`.

**Porting rules (Postgres → SQLite/D1), matching `0001_init.sql`:**
| Concern | Rule |
|---|---|
| **IDs** | Keep UUID **TEXT** PKs; generate app-side with the repo's `uuid()` (`crypto.randomUUID`). `id TEXT PRIMARY KEY`, no autoincrement. |
| **Money** | **INTEGER minor units (kuruş)** everywhere: `base_price_minor`, `price_modifier_minor`, line/order totals, VAT, shipping. `149.90 TL → 14990`. **Never REAL/float** (rounding corrupts money *and* breaks the PSP amount HMAC). Format to `₺149,90` only at render. |
| **Timestamps** | INTEGER unix **seconds** UTC; column default `(unixepoch())`; set via `nowSec()`. Render in `Europe/Istanbul` via `format.ts`. |
| **Arrays** | `products.images` (`text[]`) → one **TEXT** column holding a JSON array of R2 keys (`["store/a.webp","store/b.webp"]`). Add a `jsonArr()` parse helper next to `csv()`. |
| **JSON** | `orders.shipping_address` / `billing_address` (JSONB) → **TEXT** holding JSON; `JSON.parse` on read. For `order_items` snapshots prefer **explicit columns** (`snapshot_name`, `snapshot_unit_price_minor`, `snapshot_variant`) over an opaque blob — easier to render in the mono receipt. |
| **Enums** | TEXT + `CHECK`. e.g. `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled'))`. Keeps admin `select` options honest. |
| **`profiles`** | **Retire it.** Better Auth `user` is the identity record. Commerce-profile fields (phone, default address) go in your own `addresses` / thin `customer_profile(user_id PK, …)` table keyed by `user.id` — never inside BA-managed tables. |

**Table mapping (target shapes):**
- `categories(id TEXT PK, slug TEXT UNIQUE, name, sort_order INT, created_at INTEGER` + optional `start_at`/`end_at` for time-boxed drops`)`
- `products(id TEXT PK, slug TEXT UNIQUE, images TEXT /*JSON keys*/, base_price_minor INTEGER, stock_quantity INTEGER, is_featured INTEGER, fulfillment_mode TEXT CHECK IN('pod','preorder','stocked'), created_at, updated_at)`
- `product_variants(id TEXT PK, product_id TEXT FK, sku TEXT, price_modifier_minor INTEGER, stock_quantity INTEGER, label TEXT, sort_order INTEGER)`
- `addresses(id TEXT PK, user_id TEXT FK→user.id, full_name, phone, line1, line2, city, postal_code, country DEFAULT 'TR', is_default INTEGER, created_at)`
- `orders(id TEXT PK, order_no TEXT UNIQUE /*ORD-YYYYMM-XXXX*/, user_id TEXT NULL /*guest allowed*/, status TEXT CHECK(...), payment_status TEXT CHECK(...), subtotal_minor, vat_minor, shipping_minor, total_minor INTEGER, shipping_address TEXT, billing_address TEXT, payment_intent_id TEXT, payment_provider TEXT, created_at, updated_at)`
- `order_items(id TEXT PK, order_id TEXT FK, product_id TEXT, variant_id TEXT NULL, snapshot_name TEXT, snapshot_variant TEXT, snapshot_unit_price_minor INTEGER, qty INTEGER, line_total_minor INTEGER)`
- `cart_items(id TEXT PK, cart_id TEXT, user_id TEXT NULL, product_id TEXT, variant_id TEXT NULL, qty INTEGER, created_at, updated_at, UNIQUE(cart_id, product_id, variant_id))`
- store-home content (`hero_slides` / `about_*`) → small tables in `STORE_DB` driven by the RESOURCES admin.

---

## 5. R2 images

- perseva never actually used Supabase Storage — images are external URLs today. **Migrate them into R2** and serve via a `/store/media/<key>` route cloned from `src/pages/media/[...key].ts`.
- **Recommended:** separate bucket `devmultigroup-store-media` (binding `STORE_MEDIA`) for clean isolation. (Alternative: reuse `MEDIA` under a `store/` prefix — less infra.)
- `products.images` stores **R2 keys** (JSON array), not URLs. A store `imageSrc()` helper resolves a bare key → `/store/media/<key>` (mirrors `ui.ts` `imageSrc`).
- **Upload**: reuse the existing admin pattern (`admin/upload.ts` multipart → `env.MEDIA.put`) for small product shots; the RESOURCES `image` field type already does R2 upload + key storage, so products get image upload "for free" in the config-driven admin. For large/batch imports, add **presigned PUT** (aws4fetch S3-signing) so the browser uploads straight to R2 (bypasses Worker body/CPU limits; needs R2 CORS).
- **Serving**: read `obj.httpMetadata.contentType` as a POJO (repo note: `writeHttpMetadata` fails across platformProxy); set `cache-control: public, max-age=31536000, immutable` + etag. Image **updates write a NEW key** and swap the JSON array (never overwrite a served, long-cached key).
- **Migration script (local)**: fetch each external perseva image → `wrangler r2 object put` into the **local** bucket → rewrite `products.images` to the new keys.

---

## 6. Cart & sessions (drop Supabase realtime)

- **Guest cart**: a signed, httpOnly, `SameSite=Lax`, Secure, long-lived cookie holds an opaque `cartId` (uuid). Lines live in D1 `cart_items` (user_id NULL). Server-authoritative → survives reloads and SSRs correctly (no localStorage authority, no hydration).
- **Logged-in cart**: on login (Better Auth session), **merge** the guest `cartId` rows into the user (`UPDATE cart_items SET user_id=?, cart_id=? WHERE cart_id=<guestId>`, summing quantities on `UNIQUE(cart_id,product_id,variant_id)` conflicts), then clear the guest cookie. **Make this idempotent** — it's the one piece of real logic to get exactly right (test multi-tab + re-login).
- **Realtime**: dropped. Replace with server-rendered cart state on every navigation (`ClientRouter` re-renders the count/drawer from D1) + optimistic vanilla-JS updates in the drawer (fetch to `/api/store/cart`, optimistic bump, reconcile with server). Eventual consistency across tabs is fine for a cart. No websockets / Durable Object needed for v1.

---

## 7. Payments (Turkey)

**Shape (identical for iyzico & PayTR):** server-to-server **token init** → hosted card entry + **3D Secure** (card data never touches your Worker → zero PCI scope) → provider **POSTs a result** to your callback route → you **HMAC/signature-verify with constant-time compare** over **server-trusted amounts** and **idempotently** flip `orders.payment_status` + `status` keyed on `order_no`.

- **iyzico CheckoutForm** ([docs](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize)): `…/checkoutform/initialize/auth/ecom` → token + `paymentPageUrl`; redirect to your `callbackUrl`; one server retrieve verifies. ~2.19–3.09% + fixed. Richest docs, installments.
- **PayTR iFrame** ([docs](https://dev.paytr.com/en/iframe-api/iframe-api-2-adim)): token → iframe; result POSTed to your Notification URL; integrity via **HMAC-SHA256 over `merchant_oid + merchant_salt + status + total_amount`** — recompute before trusting. ~1.99–2.99%.
- **Stripe**: rejected — not available to TR-based entities, bills non-TRY. (Its hosted-Checkout *pattern* is exactly what iyzico/PayTR replicate.)
- **Bridge option**: launch with order created `pending/unpaid` + EFT-havale confirmation keyed on the `ORD-` number, wire the PSP when the merchant account is live.

**Security rules:** recompute VAT/shipping/total **server-side** (never trust client cart totals — they feed the signed `total_amount`); callbacks are **retried by providers → must be idempotent**; constant-time signature compare.

---

## 8. Build / deploy notes

- **One Worker, one deploy.** Store ships inside `devmultigroup-web`; no second OpenNext deploy. Drop Next.js/OpenNext.
- Add `STORE_DB`, `STORE_MEDIA` to the **same** `wrangler.jsonc`; extend `src/env.d.ts` `Env` with `STORE_DB: D1Database`, `STORE_MEDIA: R2Bucket`, `BETTER_AUTH_SECRET?: string`; run `npm run cf-typegen`.
- Store migrations in `migrations-store/` with their own `store:migrate:local|remote` npm scripts (mirroring `db:migrate:*`).
- Keep the **mandatory** `postbuild`: `astro build && node scripts/postbuild.mjs && wrangler deploy` (writes `dist/.assetsignore` or wrangler rejects the deploy). The store adds routes but doesn't change this.
- **Do not** bump Astro past 5.18.2 / adapter past 12.6.13 (issue #15237 breaks `Astro.locals.runtime.env` → silently kills `STORE_DB`). The pins are load-bearing.
- Extend `sitemap.xml.ts` / `robots.txt.ts` / `llms.txt.ts` to include `/store` product/category pages for SEO/GEO parity.
- Wire store catalog cache namespaces into the existing version-stamped KV `NS` map; remember **direct D1 writes don't bust the cache** (bump `cv:<ns>` after the import seed, or wait the TTL).

---

## 9. Local-first setup checklist

> Steps 1–11 are **`--local` only** (platformProxy emulates `STORE_DB`/`STORE_MEDIA`/KV under `.wrangler/state`; admin is open via the DEV bypass). Step 12 is the production boundary.

1. **Create the separate store D1**: `wrangler d1 create devmultigroup-store-db` → take the `database_id`, add the `STORE_DB` binding block to `wrangler.jsonc` (`migrations_dir: migrations-store`). *(Creating registers the DB in your account but applies no schema — all schema work stays `--local`.)*
2. **Add `STORE_MEDIA` R2 binding** to `wrangler.jsonc` (bucket `devmultigroup-store-media`) — or decide to reuse `MEDIA` under a `store/` prefix. Local R2 is emulated; no remote bucket yet.
3. **Extend `src/env.d.ts`** `Env` (`STORE_DB`, `STORE_MEDIA`, `BETTER_AUTH_SECRET?`) → `npm run cf-typegen`.
4. **Author `migrations-store/0001_store_init.sql`** by hand in the repo's SQL style (TEXT uuid PKs, INTEGER `unixepoch()` timestamps, `*_minor` INTEGER money, JSON-in-TEXT, enums as `CHECK`). Tables: categories, products, product_variants, addresses, orders, order_items, cart_items, store-home content.
5. **Generate Better Auth tables**: install `better-auth` (+ the Cloudflare integration) locally, write `src/lib/store/auth.ts` `createAuth(env)`, run `npx @better-auth/cli generate`, hand-port DDL into `migrations-store/0002_auth.sql` (INTEGER epoch + TEXT ids). *(v1 — can defer until after the guest-checkout MVP.)*
6. **Apply locally**: add `store:migrate:local` = `wrangler d1 migrations apply devmultigroup-store-db --local`; run it. Verify: `wrangler d1 execute devmultigroup-store-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"`.
7. **`.dev.vars`** (local-only, gitignored): `BETTER_AUTH_SECRET=<openssl rand -base64 32>`, `BETTER_AUTH_URL=http://localhost:4321`, later iyzico/PayTR **sandbox** keys. Never put these in `wrangler.jsonc` vars.
8. **Local data import script**: export perseva's Postgres data (CSV/JSON), transform (numeric→minor units, timestamptz→epoch, `text[]`→JSON, JSONB→JSON, uuid kept as TEXT), `wrangler d1 execute … --local --file=…` to seed; fetch each external product image and `wrangler r2 object put` into the **local** store bucket, rewriting `products.images` keys. *(Then bump store cache `cv:<ns>` since direct writes don't invalidate.)*
9. **Wire auth** (v1): `createAuth` factory + `src/pages/api/auth/[...all].ts` + middleware session resolution; test login/signup against **local** D1 with `npm run dev`.
10. **Port pages** into `src/pages/store/**` (catalog, PDP, vanilla-JS cart drawer, checkout), the `/store/media/[...key].ts` route, and store RESOURCES admin entries reading `STORE_DB`. Add `src/lib/store/` helpers.
11. **Payments in SANDBOX only** (test keys in `.dev.vars`): init endpoint + HMAC-verifying callback + idempotent `order_no` flip; test the full `pending → paid` flow locally.
12. **Production boundary (only after local end-to-end works, and only on your go-ahead):** `wrangler d1 migrations apply … --remote`, create the remote R2 bucket, `wrangler secret put BETTER_AUTH_SECRET` + PSP live keys, run the import against `--remote`. Steps 1–11 never touch production data.

---

## 10. Risks to engineer against

- **Better Auth singleton trap** — module-level instance capturing env at import breaks on Workers. Use the per-request `createAuth(env)` factory. *(Most common failure.)*
- **BA ↔ D1 encoding drift** — if BA writes ISO-TEXT timestamps / true-false booleans, auth tables diverge from commerce tables. Verify generated DDL; pin INTEGER epoch + 0/1.
- **`@better-auth/cli` may not target D1** — generate against local sqlite, hand-port; re-diff on every BA bump.
- **Order-number race** — `ORD-YYYYMM-XXXX` suffix can collide under concurrent checkout (D1 has no cross-request atomic sequence). Use a dedicated counter row updated in the same batch + `UNIQUE(order_no)` + retry, or a Durable Object sequencer. **Never** ship naive `COUNT()+1`.
- **Stock oversell** — decrementing `stock_quantity` without a guard oversells limited drops. Use `UPDATE … SET stock = stock - ? WHERE stock >= ?` and check rows-affected (or a Durable Object per limited SKU).
- **Payment callback security** — constant-time HMAC verify over server-trusted amounts; idempotent flips (providers retry). Tampered totals = under-charge or double-fulfilment.
- **Money-as-float regression** — any REAL column or client price math reintroduces rounding errors that corrupt totals and break the PSP HMAC. Integer minor units end-to-end.
- **Cache staleness** — direct D1 writes (import/seed/manual SQL) don't bump `cv:<ns>`; catalog reads stay stale to TTL. Bump versions after writes.
- **KV namespace collision** — Astro's session store already shares the cache KV; if BA later uses `secondaryStorage`, use a distinct prefix/namespace, TTLs ≥ 60s, ship D1-only first (avoids #4203/#4557).
- **Access ↔ BA boundary** — keep store-admin strictly under the Access-gated path or BA-authenticated customers could reach owner CRUD. BA never authorizes admin actions.
- **Astro 6 / adapter 13** would break `Astro.locals.runtime.env` (#15237) → silently kills `STORE_DB`. Gate any upgrade behind end-to-end binding re-tests.
- **Cart-merge correctness** — idempotent, quantity-summing; test multi-tab and re-login.
- **`trustedOrigins` pre-cutover** — include the `*.workers.dev` origin or auth 403s; keep in sync through the GO-LIVE cutover.
- **Fulfillment reality (non-technical, dominant)** — `stock_quantity`/shipping/orders assume self-fulfillment from Turkey. If the team can't pack & ship, you need a POD/3PL path (`fulfillment_mode='pod'`) or the store stalls regardless of code. **Decide this early (Q2).**

---

## 11. Quick env / secrets reference

| Name | Local (`.dev.vars`) | Prod (`wrangler secret` / vars) | Purpose |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ random 32B | `wrangler secret put` | Sign sessions (v1) |
| `BETTER_AUTH_URL` | `http://localhost:4321` | `https://devmultigroup.com` | baseURL/origins |
| `STORE_DB` | binding (emulated) | binding | Auth + commerce D1 |
| `STORE_MEDIA` | binding (emulated) | binding | Product images R2 |
| iyzico/PayTR keys | sandbox keys | live keys via `wrangler secret` | Payment init + callback |
| `RESEND_API_KEY` | existing | existing secret | Verify / order emails |

---

*Next: answer the four blocking questions in [`01-QUESTIONNAIRE.md`](./01-QUESTIONNAIRE.md) and I'll turn this blueprint into `migrations-store/0001_store_init.sql` + the storefront scaffold — all local.*
