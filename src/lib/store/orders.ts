// Reservations + order lifecycle. A reservation IS the order/ticket; payment is
// deferred (collected/arranged by the admin). Product-focused — no drop concept.
// Writes go straight to env.STORE_DB and invalidate the store cache namespaces.

import { all, first, run, uuid, nowSec, SNS } from "./db";
import { invalidateMany } from "../cache";
import type { OrderRow, OrderItemRow, ProductRow, VariantRow } from "./types";

const VAT_RATE = 0.18; // VAT is included in displayed prices

/** YYYYMM in Istanbul (UTC+3, no DST). */
function period(): string {
  const t = new Date((nowSec() + 3 * 3600) * 1000);
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Atomic, race-safe ORD-YYYYMM-XXXX via a counter row + RETURNING. */
async function nextOrderNo(env: Env): Promise<string> {
  const p = period();
  const row = await first<{ n: number }>(
    env.STORE_DB,
    `INSERT INTO order_counters (period, n) VALUES (?, 1)
     ON CONFLICT(period) DO UPDATE SET n = n + 1 RETURNING n`,
    [p],
  );
  const n = row?.n ?? 1;
  return `ORD-${p}-${String(n).padStart(4, "0")}`;
}

export interface ReserveInput {
  productId: string;
  variantId?: string;
  qty: number;
  buyerName: string;
  buyerEmail: string;
  notes?: string;
}

export type ReserveResult =
  | { ok: true; order: OrderRow; duplicate: boolean }
  | { ok: false; error: string };

export async function reserve(env: Env, input: ReserveInput): Promise<ReserveResult> {
  const qty = Math.max(1, Math.min(10, Math.floor(Number(input.qty) || 1)));
  const name = (input.buyerName || "").trim();
  const email = (input.buyerEmail || "").trim().toLowerCase();
  if (!name) return { ok: false, error: "İsim gerekli." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Geçerli bir e-posta gerekli." };

  const product = await first<ProductRow>(
    env.STORE_DB,
    "SELECT * FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
    [input.productId],
  );
  if (!product) return { ok: false, error: "Ürün bulunamadı." };
  const t = nowSec();

  let variant: VariantRow | null = null;
  if (input.variantId) {
    variant = await first<VariantRow>(
      env.STORE_DB,
      "SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1 LIMIT 1",
      [input.variantId, product.id],
    );
    if (!variant) return { ok: false, error: "Seçili varyant bulunamadı." };
  }

  // Dedupe: one active reservation per email per product → return existing ticket.
  const existing = await first<OrderRow>(
    env.STORE_DB,
    `SELECT o.* FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.buyer_email = ? AND oi.product_id = ? AND o.status IN ('reserved','paid')
     ORDER BY o.created_at DESC LIMIT 1`,
    [email, product.id],
  );
  if (existing) return { ok: true, order: existing, duplicate: true };

  // Oversell guard: conditional decrement; if 0 rows changed, it's out of stock.
  if (variant) {
    const r = await run(
      env.STORE_DB,
      "UPDATE product_variants SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND stock_quantity >= ?",
      [qty, t, variant.id, qty],
    );
    if ((r.meta?.changes ?? 0) < 1) return { ok: false, error: "Seçili beden için yeterli kontenjan kalmadı." };
  } else {
    const r = await run(
      env.STORE_DB,
      "UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND stock_quantity >= ?",
      [qty, t, product.id, qty],
    );
    if ((r.meta?.changes ?? 0) < 1) return { ok: false, error: "Yeterli kontenjan kalmadı." };
  }

  const unit = product.base_price_minor + (variant?.price_modifier_minor ?? 0);
  const lineTotal = unit * qty;
  const subtotal = lineTotal;
  const total = subtotal; // pickup: no shipping
  const vat = Math.round((total * VAT_RATE) / (1 + VAT_RATE)); // VAT included

  const orderId = uuid();
  const orderNo = await nextOrderNo(env);
  await run(
    env.STORE_DB,
    `INSERT INTO orders
       (id, order_no, drop_id, user_id, buyer_name, buyer_email, pickup_event_id, pickup_label,
        status, payment_status, payment_method, subtotal_minor, vat_minor, shipping_minor, total_minor, notes,
        consent_at, consent_source, consent_channel, created_at, updated_at)
     VALUES (?, ?, '', NULL, ?, ?, '', '', 'reserved', 'unpaid', '', ?, ?, 0, ?, ?, ?, 'web_form', 'web', ?, ?)`,
    [orderId, orderNo, name, email, subtotal, vat, total, (input.notes || "").trim(), t, t, t],
  );
  await run(
    env.STORE_DB,
    `INSERT INTO order_items
       (id, order_id, product_id, variant_id, snapshot_name, snapshot_variant, unit_price_minor, qty, line_total_minor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), orderId, product.id, variant?.id ?? "", product.name, variant?.label ?? "", unit, qty, lineTotal, t],
  );

  await invalidateMany(env, [SNS.products, SNS.home]);
  const order = await first<OrderRow>(env.STORE_DB, "SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
  return { ok: true, order: order!, duplicate: false };
}

/* ── reads ──────────────────────────────────────────────────────────────── */

export async function getOrderByNo(env: Env, orderNo: string): Promise<OrderRow | null> {
  return first<OrderRow>(env.STORE_DB, "SELECT * FROM orders WHERE order_no = ? LIMIT 1", [orderNo]);
}
export async function getOrderById(env: Env, id: string): Promise<OrderRow | null> {
  return first<OrderRow>(env.STORE_DB, "SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
}
export async function getOrderItems(env: Env, orderId: string): Promise<OrderItemRow[]> {
  return all<OrderItemRow>(env.STORE_DB, "SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC", [orderId]);
}

export interface OrderListQuery {
  status?: "reserved" | "paid" | "delivered" | "cancelled" | "all";
  limit?: number;
}
export async function listOrders(env: Env, q: OrderListQuery = {}): Promise<OrderRow[]> {
  const { status = "all", limit = 200 } = q;
  if (status === "all") {
    return all<OrderRow>(env.STORE_DB, "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", [limit]);
  }
  return all<OrderRow>(env.STORE_DB, "SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?", [status, limit]);
}

export interface AdminCounts {
  reserved: number;
  paid: number;
  delivered: number;
  lowStock: number;
}
export async function getAdminCounts(env: Env): Promise<AdminCounts> {
  const n = async (sql: string, p: unknown[] = []) => (await first<{ n: number }>(env.STORE_DB, sql, p))?.n ?? 0;
  return {
    reserved: await n("SELECT COUNT(*) n FROM orders WHERE status = 'reserved'"),
    paid: await n("SELECT COUNT(*) n FROM orders WHERE status = 'paid'"),
    delivered: await n("SELECT COUNT(*) n FROM orders WHERE status = 'delivered'"),
    lowStock: await n(
      `SELECT COUNT(*) n FROM products p WHERE p.is_active = 1 AND
        COALESCE((SELECT SUM(stock_quantity) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1), p.stock_quantity)
        BETWEEN 1 AND 3`,
    ),
  };
}

/* ── lifecycle (admin, behind Cloudflare Access) ──────────────────────────── */

export type OrderAction = "pay" | "deliver" | "cancel" | "reopen";

export async function advanceOrder(env: Env, id: string, action: OrderAction, method = ""): Promise<void> {
  const t = nowSec();
  const order = await getOrderById(env, id);
  if (!order) return;

  if (action === "pay") {
    await run(env.STORE_DB, "UPDATE orders SET status='paid', payment_status='paid', payment_method=?, updated_at=? WHERE id=?", [method || order.payment_method || "cash", t, id]);
  } else if (action === "deliver") {
    await run(env.STORE_DB, "UPDATE orders SET status='delivered', updated_at=? WHERE id=?", [t, id]);
  } else if (action === "reopen") {
    await run(env.STORE_DB, "UPDATE orders SET status='reserved', updated_at=? WHERE id=?", [t, id]);
  } else if (action === "cancel") {
    if (order.status !== "cancelled") {
      // restock the reserved units
      const items = await getOrderItems(env, id);
      for (const it of items) {
        if (it.variant_id) {
          await run(env.STORE_DB, "UPDATE product_variants SET stock_quantity = stock_quantity + ?, updated_at=? WHERE id=?", [it.qty, t, it.variant_id]);
        } else if (it.product_id) {
          await run(env.STORE_DB, "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at=? WHERE id=?", [it.qty, t, it.product_id]);
        }
      }
      const payment = order.payment_status === "paid" ? "refunded" : "unpaid";
      await run(env.STORE_DB, "UPDATE orders SET status='cancelled', payment_status=?, updated_at=? WHERE id=?", [payment, t, id]);
    }
  }
  await invalidateMany(env, [SNS.products, SNS.home]);
}
