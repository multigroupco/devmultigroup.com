# MultiGroup Store — Decision Questionnaire

> Answer these and the build is fully scoped. Each item has my **recommended default** so you can just say "defaults except 3, 7, 9" if you like.
> 🔴 = **blocking** (can't start the relevant build without it) · ⚪ = deferrable (a sensible default carries us; revisit later).
> Context for every answer is in [`00-RESEARCH-FINDINGS.md`](./00-RESEARCH-FINDINGS.md).

How to answer: reply inline (e.g. **Q3: PayTR** / **Q5: Turkey-only**), or just "go with recommendations." I'll also ask the four blocking ones interactively so you can answer fast.

---

## ✅ Resolved (2026-06-21) → see [`03-MVP-EVENT-PICKUP-MODEL.md`](./03-MVP-EVENT-PICKUP-MODEL.md)

The four blocking questions are answered, and they reshape the MVP into an **event-pickup pre-order** model:
- **Q1 Pricing → modest margin that funds community events** (values strip = "gelir etkinliklere", not "at-cost").
- **Q2 Fulfillment → pre-order drops only** (no held inventory; `stock_quantity` = per-drop reservation cap).
- **Q5 Payments → deferred** (no iyzico/PayTR at MVP; pay/collect at the event; PSP bolts on in v1).
- **Q7 Shipping → none; "etkinlikten teslim al"** (collect at the event → no shipping engine/cost/address).

Consequently moot/changed below: **Q6** (taksit — n/a, no online payment yet), **Q7/Q8** (shipping & threshold — replaced by event pickup), parts of **Q3/Q4** fold into the drop model. Remaining live questions: **Q9–Q13** (accounts, mascot, counter numbers, community designs) + the two new schema questions **DA/DB** in `03`. The rest below is retained as the v1 "online store" reference.

---

## A. Business model & positioning

### 🔴 Q1 — For-profit vs at-cost
Is the store a revenue line, a break-even identity vehicle, or a subsidized community perk? This sets pricing, voice, and the values copy.
- **(a) At-cost / not-for-profit** with a "where proceeds go" strip ← *recommended*
- (b) Modest margin funding community events (Linux Foundation framing)
- (c) Standard retail margin
> **Why (a):** de-commercialises a community store, builds trust, fits the no-dark-pattern monochrome aesthetic. Pair with an optional "support us" instead of fat margins.

### 🔴 Q2 — Fulfillment model
Who packs and ships? This *dwarfs* the storefront tech choice and decides whether `stock_quantity` is even real.
- (a) Self-fulfill held inventory (you pack & ship from Turkey)
- (b) Turkish print-on-demand / 3PL partner
- (c) Pre-order drops only (zero inventory risk)
- **(d) Mixed via a `fulfillment_mode` column (`pod | preorder | stocked`)**, defaulting to POD/pre-order ← *recommended*
> **Why (d):** a tiny team carries zero inventory risk; "stocked" is reserved for genuine limited drops. Even GitHub/Stripe/Supabase outsource fulfillment. **This is the single biggest real-world risk** — if no one can physically pack orders, the store stalls regardless of code.

### ⚪ Q3 — Catalog scope at launch
- **(a) Tight capsule: ~6–12 SKUs** (1 tee, 1 hoodie, sticker packs, a couple of "Koleksiyon" items) ← *recommended*
- (b) Broader catalog from day one
> **Why (a):** a curated capsule looks intentional and premium in monochrome; sparse + broad looks under-designed.

### ⚪ Q4 — Drop cadence & scarcity ethics
- (a) Stable always-on catalog
- (b) Periodic event drops (teaser → reveal → countdown)
- **(c) Hybrid: small always-on baseline + occasional event-tied capsules sold as pre-orders** ← *recommended*
> **Why (c):** honest scarcity (real `stock_quantity`, visible sold-out), calm restraint — not bot-queue urgency. Drops only work once there's a real audience to notify.

---

## B. Payments, money & shipping

### 🔴 Q5 — Payment rail
Stripe does **not** onboard Turkey-based legal entities, so a TRY-native rail is mandatory. iyzico and PayTR are **architecturally identical** from the Worker (server token-init → hosted card + 3DS → HMAC-verified callback → idempotent order flip).
- **(a) iyzico CheckoutForm** — dominant PSP, richest docs, installments/taksit, slightly higher fees (~2.19–3.09%) ← *recommended (marginally)*
- (b) PayTR iFrame — slightly lower fees (~1.99–2.99%), identical integration
- (c) Launch with manual/EFT-havale "reserve & confirm", wire a PSP later
> **Why (a):** pick whichever your **legal entity can onboard fastest** — that's the real tiebreaker, both are equally Workers-friendly. Decide ONE; do **not** abstract over both prematurely. (c) is a valid bridge if PSP onboarding would delay launch.

### ⚪ Q6 — Installments (taksit)
- **(a) No taksit** at launch ← *recommended* (irrelevant at sticker/tee price points)
- (b) Enable taksit (both PSPs support it)

### 🔴 Q7 — Shipping presentation & free-shipping threshold
Replaces the hardcoded **50 TL flat** rate. (Baymard's #1 abandonment cause is late fee surprise.)
- (a) Explicit shipping line + free-shipping threshold progress bar
- (b) All-in TL price (shipping baked in) with breakdown on tap
- **(c) Both: all-in headline on the card + threshold progress odometer in the cart** ← *recommended*
> **Needs a number from you:** what's a realistic **free-shipping threshold** (we suggest ≈ your target AOV + 30%, e.g. **₺250**?) and your **flat shipping cost** below it (keep ₺50, or current real carrier cost?).

### ⚪ Q8 — International shipping & language
- **(a) Turkey-only, TRY-only, TR-only UI** (matches `lang=tr`) ← *recommended*
- (b) Turkey-first + diaspora with a currency/region note
- (c) Full tr/en + currency selector
> **Why (a):** matches devmultigroup.com; skip the global currency selector (it's friction). The current store carries tr/en i18n — we'd **drop EN** for the store to match the rest of the site unless you want diaspora sales. Revisit only if real demand appears.

---

## C. Identity & accounts

### ⚪ Q9 — Member accounts (Better Auth) scope
- **(a) Guest-checkout-first MVP, accounts optional; land Better Auth in v1** ← *recommended*
- (b) Better Auth at launch with member pricing + early-access
- (c) Full loyalty/badge layer
> **Why (a):** lowest friction (forced signup is a top-3 abandonment cause) and lowest migration risk while Better Auth is still being wired. Accounts in v1 unlock member pricing / early access / reviews. (See setup doc §Better Auth.)

### ⚪ Q10 — Member perks (when accounts land)
Which of these matter? (multi-select) member pricing · early-access drop window · order history / reorder · saved addresses · structured fit reviews · earned badges.
> **Recommended v1 set:** order history + saved addresses + early-access window. Reviews/badges → later.

---

## D. Brand & content

### ⚪ Q11 — Mascot & product naming system
The single highest-leverage storytelling decision for a low-imagery monochrome store.
- (a) Adopt/commission a **mascot** as recurring hero
- (b) Wordmark-only identity
- **(c) Pure typographic Turkish-dev naming system** (HTML tags / CLI verbs / error codes / in-jokes) ← *recommended now*
> **Why (c):** free, ships as SSR text, replaces colour and copy. A mascot is a strong v1+ affinity bet **if** someone will design it. **Do you have a mascot or wordmark today?** And want me to draft a starter naming vocabulary in Turkish dev-slang?

### ⚪ Q12 — Counter honesty at launch
The `ImpactStrip` odometers only land if the numbers are real. A hollow "0 sipariş" undercuts the whole aesthetic.
- **(a) Only surface counters backed by real data** (community member/city counts can carry the hero before sales volume exists) ← *recommended*
- (b) Seed with lifetime community metrics
- (c) Hide counters until post-launch volume
> **Needs from you:** which real numbers can we show on day one? (members, cities reached, communities, events, total stickers ever handed out at meetups, etc.)

### ⚪ Q13 — Community-sourced designs & unbuyable swag
- **(a) Neither for now** ← *recommended*
- (b) Design submissions via a moderation queue
- (c) Claim-by-code unbuyable event swag
- (d) Both
> **Why (a):** high-affinity but each needs a workflow the team commits to running (curation, code issuing at meetups). Revisit in v1+ once the baseline store is proven.

---

## E. Architecture confirmations (I'll assume these unless you object)

These follow directly from your brief; flagging so they're explicit. Full rationale in [`02-BETTER-AUTH-AND-CF-SETUP.md`](./02-BETTER-AUTH-AND-CF-SETUP.md).

### ⚪ Q14 — Integration approach
**Assumed: (A) native Astro rewrite into `src/pages/store/**` inside the existing single Worker** — drop Next.js/OpenNext, reuse the repo's helpers/design system, bind a separate D1 + R2 in the same `wrangler.jsonc`. (Rejected: separate Worker, iframe, or buy-a-Shopify — all break "feels native to devmultigroup.com".)
> Object only if you'd rather keep the store as a standalone Next.js worker behind a route.

### ⚪ Q15 — Separate store database
**Assumed: a second D1 `devmultigroup-store-db` (binding `STORE_DB`)**, distinct from `DB`/`MAIL_DB`. Better Auth tables + all commerce tables co-locate in it (so order↔user joins work in raw SQL); main content DB stays isolated. ✅ matches your "separate its DB" instruction.

### ⚪ Q16 — `profiles` table
**Assumed: retire the standalone Supabase `profiles` table** — Better Auth's `user` table becomes the identity record (id/email/name/role). Addresses + any commerce-profile fields live in your own tables keyed by `user_id`, so Better Auth migrations never fight your columns. (This is the one place we *don't* keep the schema 1:1 — `auth.users` + `profiles` collapse into BA `user`. Everything else keeps its shape.)
> Object if you specifically want `profiles` preserved as-is.

### ⚪ Q17 — R2 bucket
**Assumed: a separate `devmultigroup-store-media` bucket (binding `STORE_MEDIA`)** served via a `/store/media/<key>` route cloned from the existing `/media/[...key].ts`. (Alternative: reuse `MEDIA` under a `store/` prefix — less infra, less isolation.)
> Mild preference either way? Default is separate-bucket for clean isolation.

---

## Fastest path
Reply: **"Defaults, and: Q5 = <iyzico|PayTR|manual-bridge>, Q7 threshold = ₺___ / flat = ₺___, Q12 numbers = <list>, mascot = <yes/no>."**
Those are the only answers I genuinely need to start; the rest have safe defaults.
