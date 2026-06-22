-- MultiGroup Store — initial schema. SEPARATE D1 (binding STORE_DB).
-- SQLite/D1. Timestamps = unix epoch SECONDS (UTC). Booleans 0/1.
-- Money = INTEGER minor units (kuruş): 149.90 TL -> 14990. Never REAL.
-- MVP model: event-pickup pre-order drops (see docs/store/03-MVP-EVENT-PICKUP-MODEL.md).

-- ── drops (time-boxed, event-tied collections) ──────────────────────────────
CREATE TABLE IF NOT EXISTS drops (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  blurb           TEXT NOT NULL DEFAULT '',
  cover_image     TEXT NOT NULL DEFAULT '',            -- R2 key or url
  opens_at        INTEGER,                             -- reservations open (null = already)
  closes_at       INTEGER,                             -- reservations close (null = open-ended)
  pickup_event_id TEXT NOT NULL DEFAULT '',            -- SOFT ref to main DB.events (no cross-db FK)
  pickup_label    TEXT NOT NULL DEFAULT '',            -- free-text fallback ("İstanbul Meetup · Kadıköy")
  pickup_at       INTEGER,                             -- pickup time fallback
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','open','closed','collected')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_drops_show ON drops (status, sort_order);

-- ── products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  drop_id          TEXT NOT NULL DEFAULT '',           -- FK drops.id
  name             TEXT NOT NULL,                       -- dev-native naming ("<Body> Tişört")
  tagline          TEXT NOT NULL DEFAULT '',            -- mono one-liner
  description      TEXT NOT NULL DEFAULT '',
  images           TEXT NOT NULL DEFAULT '[]',          -- JSON array of R2 keys
  base_price_minor INTEGER NOT NULL DEFAULT 0,          -- kuruş (VAT-inclusive)
  stock_quantity   INTEGER NOT NULL DEFAULT 0,          -- per-drop cap when no variants
  category         TEXT NOT NULL DEFAULT 'giyim'
                    CHECK (category IN ('giyim','yasam','koleksiyon')),
  fulfillment_mode TEXT NOT NULL DEFAULT 'preorder'
                    CHECK (fulfillment_mode IN ('pod','preorder','stocked')),
  material         TEXT NOT NULL DEFAULT '',            -- datasheet: "240gsm penye"
  fit_note         TEXT NOT NULL DEFAULT '',            -- "Model 183cm, M giyiyor · Tam kalıp"
  size_chart       TEXT NOT NULL DEFAULT '',            -- cm chart (free text)
  is_featured      INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_products_show ON products (is_active, drop_id, sort_order);

-- ── product variants (size / colour) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                   TEXT PRIMARY KEY,
  product_id           TEXT NOT NULL,                  -- FK products.id
  label                TEXT NOT NULL,                  -- "M" / "Siyah"
  sku                  TEXT NOT NULL DEFAULT '',
  price_modifier_minor INTEGER NOT NULL DEFAULT 0,     -- kuruş, added to base
  stock_quantity       INTEGER NOT NULL DEFAULT 0,     -- per-drop reservation cap (remaining)
  sort_order           INTEGER NOT NULL DEFAULT 0,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at           INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants (product_id, sort_order);

-- ── orders (a reservation = the pickup ticket) ──────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  order_no        TEXT NOT NULL UNIQUE,                -- ORD-YYYYMM-XXXX
  drop_id         TEXT NOT NULL DEFAULT '',
  user_id         TEXT,                                -- nullable (guest); future Better Auth user.id
  buyer_name      TEXT NOT NULL,
  buyer_email     TEXT NOT NULL,
  pickup_event_id TEXT NOT NULL DEFAULT '',
  pickup_label    TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'reserved'
                    CHECK (status IN ('reserved','paid','delivered','cancelled')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','refunded')),
  payment_method  TEXT NOT NULL DEFAULT '',            -- 'cash' | 'eft' (recorded at pickup)
  subtotal_minor  INTEGER NOT NULL DEFAULT 0,
  vat_minor       INTEGER NOT NULL DEFAULT 0,          -- VAT included in total (18%)
  shipping_minor  INTEGER NOT NULL DEFAULT 0,          -- 0 for pickup
  total_minor     INTEGER NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_orders_queue ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (buyer_email, drop_id);

-- ── order items (snapshots at reservation time) ─────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL,                      -- FK orders.id
  product_id       TEXT NOT NULL DEFAULT '',
  variant_id       TEXT NOT NULL DEFAULT '',
  snapshot_name    TEXT NOT NULL DEFAULT '',
  snapshot_variant TEXT NOT NULL DEFAULT '',
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  qty              INTEGER NOT NULL DEFAULT 1,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- ── atomic per-period order-number counter (race-safe via RETURNING) ────────
CREATE TABLE IF NOT EXISTS order_counters (
  period TEXT PRIMARY KEY,                             -- YYYYMM
  n      INTEGER NOT NULL DEFAULT 0
);
