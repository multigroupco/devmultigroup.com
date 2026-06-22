// Public, cached read layer over the store D1 (env.STORE_DB). Pages call these.
// Product-focused: products are browsed directly (by category), no drop concept.

import { cached } from "../cache";
import { all, first, SNS } from "./db";
import type { ProductRow, VariantRow } from "./types";

/** A product row enriched with computed availability for cards/listing. */
export type ProductCard = ProductRow & { remaining: number; variant_count: number };

const PRODUCT_SELECT = `
  SELECT p.*,
    COALESCE((SELECT SUM(stock_quantity) FROM product_variants v
              WHERE v.product_id = p.id AND v.is_active = 1), p.stock_quantity) AS remaining,
    (SELECT COUNT(*) FROM product_variants v
              WHERE v.product_id = p.id AND v.is_active = 1) AS variant_count
  FROM products p`;

/* ── products ───────────────────────────────────────────────────────────── */

export interface ProductQuery {
  category?: string;
  featured?: boolean;
  limit?: number;
}

export async function listProducts(env: Env, q: ProductQuery = {}): Promise<ProductCard[]> {
  const { category, featured, limit = 60 } = q;
  const key = `list:${category ?? ""}:${featured ? 1 : 0}:${limit}`;
  return cached(env, SNS.products, key, () => {
    const where = ["p.is_active = 1"];
    const params: unknown[] = [];
    if (category) {
      where.push("p.category = ?");
      params.push(category);
    }
    if (featured) where.push("p.is_featured = 1");
    params.push(limit);
    return all<ProductCard>(
      env.STORE_DB,
      `${PRODUCT_SELECT} WHERE ${where.join(" AND ")}
       ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC LIMIT ?`,
      params,
    );
  });
}

export async function getProduct(env: Env, slug: string): Promise<ProductCard | null> {
  return cached(env, SNS.products, `get:${slug}`, () =>
    first<ProductCard>(env.STORE_DB, `${PRODUCT_SELECT} WHERE p.slug = ? LIMIT 1`, [slug]),
  );
}

export async function getVariants(env: Env, productId: string): Promise<VariantRow[]> {
  return cached(env, SNS.products, `var:${productId}`, () =>
    all<VariantRow>(
      env.STORE_DB,
      `SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
      [productId],
    ),
  );
}

/* ── impact / stats (for the ImpactStrip odometers) ─────────────────────── */

export interface StoreImpact {
  designs: number; // active products
  reserved: number; // total reserved units (reserved + paid + delivered)
  soldOut: number; // products with 0 remaining
}

export async function getStoreImpact(env: Env): Promise<StoreImpact> {
  return cached(env, SNS.home, "impact", async () => {
    const n = async (sql: string, p: unknown[] = []) =>
      (await first<{ n: number }>(env.STORE_DB, sql, p))?.n ?? 0;
    return {
      designs: await n("SELECT COUNT(*) n FROM products WHERE is_active = 1"),
      reserved: await n(
        `SELECT COALESCE(SUM(oi.qty),0) n FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN ('reserved','paid','delivered')`,
      ),
      soldOut: await n(
        `SELECT COUNT(*) n FROM products p WHERE p.is_active = 1 AND
          COALESCE((SELECT SUM(stock_quantity) FROM product_variants v
                    WHERE v.product_id = p.id AND v.is_active = 1), p.stock_quantity) <= 0`,
      ),
    };
  });
}
