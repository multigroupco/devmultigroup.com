# MultiGroup Store — MVP Concept: "Etkinlikten Teslim" Pre-Order Drops

> **This doc is the source of truth for what we build first.** It supersedes the shipping/PSP-heavy MVP described in [`00-RESEARCH-FINDINGS.md`](./00-RESEARCH-FINDINGS.md) and [`02-BETTER-AUTH-AND-CF-SETUP.md`](./02-BETTER-AUTH-AND-CF-SETUP.md) — those remain valid as the deep reference and the *future* (online-prepay + shipping) path.
> Locked from your answers on 2026-06-21.

---

## Decisions locked

| Q | Decision | Consequence |
|---|---|---|
| **Pricing** | **Modest margin that funds community events** | Values strip = "gelir topluluk etkinliklerine gidiyor" (not "at-cost"); small markup baked into price. |
| **Fulfillment** | **Pre-order drops only** | No held inventory; everything is made-to-order per drop. `stock_quantity` = a per-drop reservation cap, not a warehouse count. |
| **Delivery** | **Event pickup ("etkinlikten teslim al")** | **No shipping engine, no shipping cost, no shipping address.** Orders are collected in person at an event. |
| **Payments** | **Deferred** | **No PSP (iyzico/PayTR) at MVP.** Payment is collected/confirmed at pickup (cash/EFT). Orders live as `reserved / unpaid` until then. The designed PSP callback bolts on later untouched. |

**Net effect:** the MVP is a **reservation system tied to events**, not a checkout. The single hardest things in a normal store — online payment and shipping — are both out of MVP scope.

---

## The concept in one paragraph

Merch is released as **event-tied pre-order drops**. A drop opens for a window, shows a live **"X / N ayrıldı"** (claimed/remaining) odometer + a countdown, and tells buyers **where and when to collect** ("İstanbul meetup'ında teslim · 12 Tem"). A buyer **reserves** a size/variant in a few taps (guest-first, just name + contact), gets an **`ORD-YYYYMM-XXXX` pickup ticket** rendered as the monochrome receipt, and **pays + collects at the event**. The admin works a simple **pickup queue** (reserved → paid → delivered). Proceeds fund the events themselves — which the values strip says plainly.

This makes the store a **native downstream of devmultigroup.com's events calendar**: a drop is attached to a meetup, and the merch shows up when the community does.

---

## The flow

**Buyer**
1. `/store` hero → ImpactStrip counters (real community numbers) + the **active drop**.
2. Drop page: products, **"X / N ayrıldı"** odometer + countdown, pickup event + date, values line.
3. PDP: button-style variant selectors (disabled-not-hidden from the per-drop cap), datasheet + fit line, "Bu üründe teslim: <etkinlik>".
4. **Reserve** (not "buy"): pick variant → *Ayırt* → leave **name + contact** (+ choose pickup event if several) → done. Guest-first; account optional (v1).
5. Get **order no = pickup ticket** (mono receipt / SSR odometer ticket). Optional confirmation email (Resend, already wired).

**Admin** (behind existing Cloudflare Access — no login to build)
6. **Pickup queue**: filter by drop / event, statuses `reserved → paid → delivered` (+ `cancelled`), one-click advance.
7. At the event: look up the order no, **collect payment (cash/EFT)**, mark `paid` then `delivered`.
8. Inline reservation-cap editor per product; "X / N ayrıldı" per drop.

---

## What changes vs. the generic plan

**Removed from MVP** (deferred to the "online store" phase): PSP integration (iyzico/PayTR), shipping cost & flat-rate logic, shipping address collection, free-shipping threshold odometer, billing address.

**Kept / re-pointed:**
- The **odometer** moves from "free-shipping progress" → **"claimed / remaining"** per drop + countdown.
- "Checkout" → **reserve** flow; "cart drawer" still useful but optional at MVP (a drop is often a single-item reserve — a lightweight reserve modal may be enough; the vanilla-JS drawer can come when multi-item drops appear).
- VAT: still show prices VAT-inclusive (modest margin includes it); snapshot the breakdown on the order for records.
- Everything else (separate `STORE_DB`, R2 images, monochrome design extension, admin RESOURCES, KV cache, local-first build) is unchanged.

---

## Revised data model (deltas only — rest per [`02-…`](./02-BETTER-AUTH-AND-CF-SETUP.md) §4)

**`drops`** (or reuse `categories` as time-boxed drops — see open question DA below):
```
id TEXT PK, slug TEXT UNIQUE, title TEXT, blurb TEXT,
opens_at INTEGER, closes_at INTEGER,            -- drop window (unixepoch)
pickup_event_id TEXT,                            -- link to a meetup (see DA)
pickup_label TEXT, pickup_at INTEGER,            -- free-text/when, fallback
reservation_cap INTEGER,                         -- optional overall cap
status TEXT CHECK(status IN('draft','open','closed','collected')),
created_at INTEGER, updated_at INTEGER
```

**`products` / `product_variants`** — as planned, but `stock_quantity` is interpreted as **per-drop reservation cap** (oversell guard still applies: `UPDATE … SET stock = stock - ? WHERE stock >= ?`). Add `drop_id` (or `category_id` if categories *are* drops).

**`orders`** — pickup semantics replace shipping:
```
id TEXT PK, order_no TEXT UNIQUE,                -- ORD-YYYYMM-XXXX = pickup ticket
user_id TEXT NULL,                               -- guest allowed
buyer_name TEXT, buyer_email TEXT,               -- DB answer: name + email; dedupe per drop on email (see DB)
pickup_event_id TEXT, pickup_label TEXT,         -- where they collect (DA: nullable DB.events ref + free-text)
status TEXT CHECK(status IN('reserved','paid','delivered','cancelled')),
payment_status TEXT CHECK(payment_status IN('unpaid','paid','refunded')),
payment_method TEXT,                             -- 'cash' | 'eft' | null, set at pickup
subtotal_minor INTEGER, vat_minor INTEGER, total_minor INTEGER,  -- shipping_minor = 0/omitted
notes TEXT, created_at INTEGER, updated_at INTEGER
```
*(`shipping_address` / `billing_address` / `shipping_minor` kept nullable/omitted for the future shipping phase.)*

**`order_items`** — unchanged (snapshots).
**`addresses`** — **not needed at MVP** (no shipping). Defer to the online-store phase.
**`cart_items`** — optional at MVP if reservations are single-item; keep the table for multi-item drops.

---

## Revised MVP roadmap

1. Separate `STORE_DB` + `0001_store_init.sql` (drops, products, variants, orders, order_items; addresses/cart deferred). **[M]**
2. Product images → R2 (`/store/media/<key>`) + admin upload. **[M]**
3. Storefront: `/store` hero + ImpactStrip (real numbers) + active drop; drop page with **claimed/remaining odometer + countdown + pickup info**. **[M]**
4. PDP: button variant selectors (cap-aware), datasheet + fit line, pickup line, Turkish-dev naming. **[L]**
5. **Reserve flow** + `ORD-` pickup ticket (mono receipt) + optional Resend confirmation email. Guest-first. Atomic order-no counter + oversell guard. **[M]**
6. Admin: drops + products/variants RESOURCES; **pickup queue** (reserved→paid→delivered, one-click advance, filter by drop/event); inline cap editor; "today/active drop" ImpactStrip. **[M]**
7. Values strip ("gelir etkinliklere") + sold-out/closed designed states. **[S]**

**v1+ (the "online store" upgrade, already designed in `02-…`):** Better Auth accounts, online prepay via iyzico/PayTR (the HMAC callback), shipping + addresses + free-shipping odometer for diaspora/non-event buyers, reviews/badges.

---

## Resolved schema specifics (2026-06-21)

**DA — Drop ↔ events: BOTH, link when possible.**
`drops.pickup_event_id` is a **nullable soft reference to `DB.events`** (the *main* content D1, by `id`/`slug`). Because it's a different database, there is **no SQL FK across D1s** — it's a soft link resolved in app code (read the event from `DB` when rendering a drop; fall back to `pickup_label` / `pickup_at` when no event is linked). So a drop attaches to a real meetup when one exists, and still works as free-text otherwise.

**DB — Reserve fields: name + email, with dedupe.**
Collect **`buyer_name` + `buyer_email`** only (guest-first; account optional in v1). On reservation submit, **check for an existing reservation by email for the same drop** (and surface the existing `ORD-` ticket instead of silently creating a duplicate). Implementation: a lookup `SELECT … FROM orders WHERE buyer_email=? AND <same drop>` before insert, plus consider a partial `UNIQUE` guard; treat a resubmit as "you already reserved — here's your ticket" rather than a hard error. Emails are stored in `STORE_DB` (not the marketing `MAIL_DB`) for now.
