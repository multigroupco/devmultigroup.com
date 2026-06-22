# MultiGroup Store — Research Findings & Ideas Catalog

> Phase 1 planning doc. Local-first; nothing here touches remote Cloudflare.
> Source: parallel research workflow across 6 lenses (developer-brand merch, community/conference/creator merch, premium monochrome e-commerce UX, merch product-detail best practices, Cloudflare edge-commerce stack, small-store admin/analytics) studying ~55 real stores + current Better Auth / iyzico / PayTR / Cloudflare docs.
> Companion docs: [`01-QUESTIONNAIRE.md`](./01-QUESTIONNAIRE.md) (decisions to make) · [`02-BETTER-AUTH-AND-CF-SETUP.md`](./02-BETTER-AUTH-AND-CF-SETUP.md) (what to build & set up).

> **⚑ Scope update (2026-06-21):** the MVP is now an **event-pickup pre-order ("etkinlikten teslim") model** — pre-order drops, collect at the event, payments deferred, no shipping. See **[`03-MVP-EVENT-PICKUP-MODEL.md`](./03-MVP-EVENT-PICKUP-MODEL.md)** for what we actually build first. The catalog/patterns below stay valid; the *free-shipping odometer* re-points to a *claimed/remaining* odometer, and *checkout* becomes *reserve*.

---

## 0. The one-line thesis

**This is not a shop. It's the community's wearable membership card.**

For a developer community, merch is *identity and belonging first, revenue a distant second*. Every strong store we studied (Vercel, Supabase, Railway, freeCodeCamp, GitHub) optimizes for "wear the community," not for retail conversion. That maps almost perfectly onto the existing devmultigroup.com design language — AMOLED true-black, "white is the only accent," film-grain + blobs, Space Grotesk display, JetBrains Mono numerals, and the `ImpactStrip` odometer counters. The store should read as a **native room of devmultigroup.com**, not a bolted-on Shopify clone.

Two near-free differentiators carry the whole concept:

1. **Turkish-dev-native product *naming* as storytelling** — HTML tags, CLI verbs, error codes, local in-jokes, rendered in JetBrains Mono. The name *is* the marketing copy. This replaces colour and photography budget. (GitHub's `<Body>` Tee / `<Header>` Hat is the canonical proof.)
2. **SSR community-impact counters** — "X çıkartma gönderildi", "Y şehre kargo", "N drop tükendi" — turning commerce data into the site's existing *impactful counter* aesthetic with **zero chart library**.

Keep the catalog **small and curated (a capsule, not a long-tail store)**, anchored by a cheap sticker pack as the top-of-funnel SKU, with an explicit values strip ("kâr için değil / where proceeds go") that de-commercialises the whole thing.

---

## 1. What the best stores actually do (by example)

### Developer-brand / company merch
| Store | The one thing to steal |
|---|---|
| [The GitHub Shop](https://thegithubshop.com) | **Product name = the joke.** `<Body>` Tee, `<Header>` Hat, "Ship It" mug. Three-tier spine: Apparel / Lifestyle / Collectibles + browse rails (New, Best Sellers, Stickers). Stickers merchandised as real products (50-packs, themed 6-packs). |
| [Vercel Swag Store](https://swag-store-delta.vercel.app/) | **Closest visual twin to us.** Monochrome catalog where products are named by finish ("Matte Black Bottle", "Black Crewneck"). Tagline "for those who ship." **Free sticker pack on every order over $50** — copy this AOV lever verbatim. |
| [Supabase Store](https://supabase.store/) | **Scarcity as the engine.** "Limited edition / Community / Team" split, "once it's gone, it's gone forever", **SOLD OUT left visible** as social proof. Drops tied to Launch Weeks. Dark-mode-first ("Dark Mode Tee"). Ironic pricing as brand voice. |
| [Railway Store](https://shop.railway.app/) | **"Priced to cover production, not to make a profit."** A community-trust signal. Embroidered patches & magnets as a distinctive cheap collectible. Low price floor ($2.20 stickers). |
| [Ardan Labs](https://store.ardanlabs.com/) / [JetBrains](https://www.jetbrainsmerchandise.com/) | Mascot-as-product (Gopher, Kodee) drives disproportionate affinity. Honest processing/shipping banners reduce "where's my order" support load. |
| [Stripe Shop](https://stripe.shop/) · [Cloudflare](https://shopcloudflare.brilliantmade.com/) · [Linux Foundation](https://linuxfoundation.store/) · [Postman](https://store.postman.com/) · [daily.dev](https://store.daily.dev/) | Even huge brands **outsource fulfillment** (Brilliant/POD). Postman ships *content-as-merch* (a printed graphic novel). daily.dev uses voice-y collection names. |

### Community / conference / creator
| Store | The one thing to steal |
|---|---|
| [freeCodeCamp Shop](https://shop.freecodecamp.org/) | Non-profit framing; all-in price (shipping baked in) kills fee-surprise. |
| [Hacktoberfest + Holopin](https://hacktoberfest.com/participation/) | **Digital badges are the real loyalty layer** — earned, not sold. |
| [Wes Bos `bos.af`](https://bos.af/) | Free-sticker goodwill program → laptop-lid marketing + signups. |
| [Fourthwall](https://fourthwall.com/memberships) | **Graduated fulfillment**: POD + pre-orders + memberships → zero inventory risk for a tiny team. |
| [Sticker Mule](https://www.stickermule.com/products/sticker-packs) | Per-unit tier pricing on packs ("₺8,90/adet, next tier −23%") as an upsell. |
| [React Conf](https://conf.react.dev/) / [GDG](https://gdg.community.dev/) | Event-drop model; some swag is **earned/claimed at events**, not sold. |

### Premium monochrome UX references
[Teenage Engineering](https://teenage.engineering/store) (instrument-panel spec sheets) · [Nothing](https://nothing.tech/products/phone-3) (numerals as texture, dot-matrix) · [Aesop](https://www.aesop.com/) (single baseline axis = luxury calm) · [Perplexity Supply](https://shop.perplexity.ai/) (curated capsule) · [Vercel Commerce demo](https://demo.vercel.store/) (the headless reference) · [Solace / Awwwards minimal](https://www.awwwards.com/inspiration/solace-an-elegant-and-minimal-shopify-e-commerce).

### The trust benchmark
[Baymard Institute product-page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux): the **#1 abandonment cause is late fee surprise**; the **#1 PDP fix is button-style variant selectors with stock baked in** (never dropdowns/hidden); **forced account creation is a top-3 abandonment cause** → guest checkout first.

---

## 2. Patterns, organized by where they apply

### Storefront (`/store`)
- Hero = the site's grain+blob background + **one** Space Grotesk headline + **one** pill CTA, with an `ImpactStrip` odometer strip under it.
- **Category-as-tone navigation**: each category uses a near-white step from the existing 7-gray `ACCENTS` scale (`categoryAccent` in `ui.ts`) instead of a hue — browsing literally reads as a tonal shift.
- Three-tier taxonomy on the existing `categories` table: **Giyim / Yaşam / Koleksiyon**, plus cross-cutting SSR rails: *Yeni*, *Çok Satan* (from `order_items` aggregate), *Çıkartmalar*, *Drop'lar*.
- **On-black product photography as a hard rule** — every shot on `#000` with one soft top-light so the catalog is one continuous AMOLED surface. (Single biggest premium-feel lever; enforce via admin upload guidance, not code.)
- Shared-element **View Transition** from card image → PDP hero (free on the already-mounted `ClientRouter`; gate on `prefers-reduced-motion`).
- Product cards carry SSR micro-counters: "Son 3 adet" (low stock) and optionally "Bu hafta N satıldı".
- Empty states as designed true-black moments (one blob + grain + a single CTA), reusing the site background.

### Product page (PDP)
- **Button-style variant selectors with stock baked in** (Baymard #1): every size/colour is a tappable button computed from `product_variants.stock`; unavailable combos shown disabled/struck-through, **never hidden**. Out-of-stock → inline "Haber ver". Fully SSR, no island.
- **Variant colours as tone-swatches** + the colour *name* in JetBrains Mono — turns the monochrome constraint into a deliberate selector aesthetic.
- **Datasheet/spec block** as the trust device (a 2-column mono table: malzeme, ağırlık "240gsm", kalıp/fit, baskı yöntemi, beden tablosu in cm) — engineering-honesty substitutes for star-reviews.
- **Fit-certainty line** at near-zero cost: "Model 183cm, M giyiyor" + verdict ("Tam kalıp" / "Bir beden büyük al") + cm chart → kills the #1 apparel return driver. Make it a *required* admin field.
- Made-to-order vs in-stock as a typographic tone-badge with dynamic ship-time copy driven by `stock_quantity`.
- Sticky mono buy bar (`position:sticky`) with synced pills + live price; on add → one white pulse + cart drawer slide (the single accent action per screen).
- Numerals (price, SKU, stock-left, order number) all in JetBrains Mono → numbers become the texture that replaces colour (the Nothing move).

### Cart & checkout
- **Hand-built vanilla-JS cart drawer** (slide-out), not a cart page — Vercel/Allbirds model, ~17% CVR lift. Re-init on `astro:page-load` like the existing inline scripts (header blur, lightbox).
- **Free-shipping progress bar as an odometer** ("₺X / ₺250 — ₺Y kaldı", a thin white line filling on black). Highest-AOV mechanic (10–25%); retires the hardcoded 50 TL flat shipping into a strategic lever. Threshold ≈ current AOV +30%.
- **Free-sticker-over-threshold** rule (Vercel) surfaced on the same bar → every buyer gets a laptop-lid sticker.
- **Guest checkout first**, express button pinned at the top of the drawer.
- **Server-computed totals only**: recompute VAT (18%) + shipping server-side, snapshot into `order_items`, never trust client cart totals (they feed the payment amount + the PSP HMAC).
- Monochrome **"receipt"** as the confirmation motif: JetBrains Mono line items rendered like a terminal printout; render the `ORD-YYYYMM-XXXX` number as an SSR odometer ticket.

### Merch-specific
- **Product name carries the story** — a Turkish-dev naming system (`<Body>` Tişört, "404 Tişört", CLI verbs). Highest-leverage decision for a low-imagery monochrome store.
- **Stickers = the hero top-of-funnel SKU** (flat-TL, ships anywhere), named themed packs ("Dev Mode" model) as one-click adds, build-your-own as the power-user path.
- **"Koleksiyon" tier** of cheap high-affinity goods — enamel pins, patches, magnets, a mascot sticker — the identity SKUs apparel can't carry alone.
- **`fulfillment_mode` per product (`pod | preorder | stocked`)** so the *same* monochrome card transparently represents at-cost print-on-demand, no-risk pre-orders, or genuinely stocked limited items. Lets a tiny team run merch with zero upfront inventory.
- **Event-drop model**: tie capsules to meetups/hackathons; each drop = a named collection page with a countdown + "X / N claimed" odometer. Sold as **pre-orders** → zero inventory risk. (Add optional `start_at`/`end_at` to `categories`.)
- **Sold-out as a designed state** (mono "TÜKENDİ" pill, dimmed-but-present card) — FOMO + social proof off the existing `stock_quantity`.

### Trust / social proof (no third-party reviews widget)
- **Values strip** (mono, factual): where proceeds go, "at-cost / kâr için değil", VAT + shipping shown plainly.
- Shipping/VAT facts surfaced **early** as quiet utility labels (Baymard #1 abandonment fix).
- Engineering-honesty datasheet substitutes for star reviews.
- **SSR community-impact counters** as social proof in the project's *own* counter language — but only if the numbers are real.
- Structured **fit reviews** ("%82 beden tam oturuyor", a SQL `GROUP BY` rendered via `Stat.astro`) and a community-photo UGC wall — both **deferred**, need customer identity (Better Auth) live first.

---

## 3. "Impactful" data-viz — mapped to the existing design system

The site has **no chart library and shouldn't add one.** Everything below renders server-side from a handful of D1 aggregate queries, reuses existing components, and is `prefers-reduced-motion`-safe by construction.

| Idea | Where | How it stays monochrome | Build note |
|---|---|---|---|
| **Storefront ImpactStrip** ("X çıkartma gönderildi / Y şehre kargo / N drop tükendi") | `/store` hero | Reuses `ImpactStrip.astro` verbatim (tabular-nums, mono labels) | Each value = one `COUNT()`/`SUM()` over orders/order_items, KV-cached, invalidated on order write |
| **Drop countdown + "X claimed / Y remaining"** odometer | Drop/limited PDPs | Same odometer + a mono `HH:MM:SS` countdown | Remaining = `stock_quantity`; tiny vanilla ticker re-init on `astro:page-load`, static SSR fallback |
| **Free-shipping progress bar** | Cart drawer | A single animated white line on black, width = SSR % | Width computed server-side from subtotal vs threshold |
| **Low-stock / "sold this week" micro-counters** | Product cards | `Stat.astro` `.text-grad` gradient adds depth without hue | Low stock from `stock_quantity`; "sold" from `order_items` timestamps, KV-cached; shown only below a real threshold |
| **Admin "today" ImpactStrip** (Bekleyen / Kargo bekliyor / Stok azaldı) | `/store/admin` overview | Same odometers; the Vercel "did it work?" action-first moment | Three indexed aggregate queries, each odometer links to a filtered queue |
| **Monthly NET revenue hero + period delta** | Admin analytics | `Stat.astro` at display scale; delta as a near-white tone-pill with up/down glyph — **no red/green** | NET = `SUM(order_items)` minus VAT and shipping; `?range=&compare=` GET re-runs SSR via `ClientRouter` |
| **`Sparkline.astro`** (dependency-free inline-SVG `<polyline>` in `currentColor`) + CSS-only orders-per-day bars | Admin revenue + top-products table | Inherits mono tokens via `currentColor`, ships zero JS | Takes `number[]` from one `GROUP BY` query; CSS bars = flexbox + height % |
| Conversion funnel (3 stacked CSS bars) | Admin (opt-in) | Pure CSS widths, tonal fills | **Deferred** — needs a sessions denominator (PostHog/CF Web Analytics → D1) |

**New components to add to the design system:** `Sparkline.astro` (inline-SVG line), a CSS bar-chart partial, a mono `Receipt` partial, a `DropCountdown` ticker, and store-flavored reuse of `ImpactStrip`/`Stat`. That's the entire "charts/graphs" surface — no Recharts/Chart.js.

---

## 4. Prioritized roadmap

### MVP (the store that can take a real order)
- SSR product listing + PDP: on-black photography, button-style variant selectors (disabled-not-hidden), Turkish-dev naming, datasheet + fit line. **[L]**
- Migrate product images from external URLs into **R2** (`/store/media/<key>`) with admin uploads. **[M]**
- **Separate store D1** + keep-schema migration off Supabase (UUID text PKs app-side; atomic `ORD-YYYYMM-XXXX` counter). **[M]**
- Hand-built vanilla-JS **cart drawer** + free-shipping progress odometer. **[M]**
- Hosted **Turkish payment rail** (iyzico CheckoutForm *or* PayTR iframe) + HMAC-verified idempotent SSR callback. **[M, BLOCKING on which rail]**
- **Guest checkout** (cookie `cartId` + D1 `cart_items`), server-computed VAT/shipping snapshotted to order. **[S]**
- Storefront **ImpactStrip** counters + monochrome receipt + values/at-cost strip. **[S]**
- **Admin**: RESOURCES for products/variants/categories/orders, "today" ImpactStrip queue, order status chips + advance, inline stock editor. (Cloudflare Access stays the only admin gate → no auth build.) **[M]**
- Sticker-pack hero SKU + free-sticker-over-threshold + per-unit/tier pricing. **[S]**
- Sold-out designed state, low-stock/"sold this week" counters, category-as-tone nav, voice-y collection names. **[S]**

### v1 (orientation + identity)
- Admin **analytics tab**: NET revenue hero + delta pill, `Sparkline.astro` + CSS bars, top-products, `?range=&compare=`. **[M]**
- **Better Auth (customer accounts)** on the store D1 via native D1/Kysely dialect; role via admin plugin. **[L]**
- **Event-drop / capsule model**: time-boxed collections, countdown + claimed/remaining odometer, `fulfillment_mode`. **[M]**
- **Member perks**: early-access window + member pricing gated on role; content-as-merch zine/sticker-sheet SKU. **[M]**

### Later
- Structured fit reviews + fit-confidence Stat; community-photo UGC wall (`review_images` in R2 + moderation). **[M]**
- Earned shareable badge board (Holopin-style) + referral token + "claim with code" event swag. **[L]**
- Customer email on status change + delay banners; conversion funnel once a session source is piped into D1. **[S]**

---

## 5. The decisions this raises

Eleven open decisions came out of the research; **four are blocking** (you can't sensibly start the build without them). They're written up — with options and my recommendation for each — in [`01-QUESTIONNAIRE.md`](./01-QUESTIONNAIRE.md). The blocking four:

1. **For-profit vs at-cost** (sets pricing, voice, the entire values copy).
2. **Fulfillment model** (self-fulfill / Turkish POD / pre-order drops) — *dwarfs the storefront tech choice and decides whether `stock_quantity` is even real.*
3. **Payment rail** (iyzico vs PayTR — Stripe is unavailable to Turkey-based entities).
4. **Shipping presentation + free-shipping threshold** (replaces the hardcoded 50 TL flat rate).
