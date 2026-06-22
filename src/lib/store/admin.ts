// Config-driven store admin — mirrors lib/admin.ts but bound to STORE_DB /
// STORE_MEDIA. Adds `optionsFrom` (dynamic selects) and a `beforeSave` hook
// (used to fold a single product image upload into the images JSON column).

import type { Field } from "../admin";
import { all, first, run, uuid, nowSec, slugify, SNS, parseImages } from "./db";
import { invalidateMany } from "../cache";

export interface StoreField extends Field {
  /** Populate select options dynamically (resolved in the edit page). */
  optionsFrom?: "products";
  /** Not a real DB column — handled by beforeSave (e.g. product image → images JSON). */
  virtual?: boolean;
}

export interface StoreResource {
  key: string;
  label: string;
  singular: string;
  table: string;
  icon: string;
  columns: string[]; // real DB columns written on save
  fields: StoreField[];
  listColumns: { name: string; label: string }[];
  defaultSort: string;
  ns: string[];
  beforeSave?: (env: Env, values: Record<string, unknown>, form: FormData, id: string) => Promise<void> | void;
}

const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x }));
const TR_OFFSET = "+03:00";
const fromLocalInput = (s: string): number | null => {
  if (!s) return null;
  const ms = Date.parse(`${s}:00${TR_OFFSET}`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

async function uploadImage(env: Env, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `store/products/${nowSec()}-${uuid().slice(0, 8)}.${ext}`;
  await env.STORE_MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return key;
}

export const STORE_RESOURCES: Record<string, StoreResource> = {
  products: {
    key: "products",
    label: "Ürünler",
    singular: "Ürün",
    table: "products",
    icon: "shopping-bag",
    columns: ["slug", "name", "tagline", "description", "images", "base_price_minor", "stock_quantity", "category", "fulfillment_mode", "material", "fit_note", "size_chart", "is_featured", "is_active", "sort_order"],
    defaultSort: "sort_order ASC, created_at DESC",
    ns: [SNS.products, SNS.home],
    listColumns: [
      { name: "name", label: "Ad" },
      { name: "category", label: "Kategori" },
      { name: "base_price_minor", label: "Fiyat" },
      { name: "is_active", label: "Aktif" },
    ],
    fields: [
      { name: "name", label: "Ürün adı", type: "text", required: true, help: "Dev-native isim — örn. “<Body> Tişört”." },
      { name: "slug", label: "Slug", type: "text", help: "Boş bırak → addan üretilir." },
      { name: "tagline", label: "Tagline (mono)", type: "text", full: true },
      { name: "description", label: "Açıklama", type: "textarea", full: true },
      { name: "image", label: "Görsel", type: "image", virtual: true, full: true, help: "Tek görsel. Ürünü #000 üzerinde çek (mono katalog)." },
      { name: "base_price_minor", label: "Fiyat (kuruş)", type: "number", help: "149,90 TL = 14990. KDV dahil." },
      { name: "stock_quantity", label: "Kontenjan", type: "number", help: "Varyant yoksa ürün kapasitesi." },
      { name: "category", label: "Kategori", type: "select", options: opt("giyim", "yasam", "koleksiyon") },
      { name: "fulfillment_mode", label: "Karşılama", type: "select", options: opt("preorder", "pod", "stocked") },
      { name: "material", label: "Malzeme (datasheet)", type: "text", full: true, help: "örn. “240gsm · %100 penye”." },
      { name: "fit_note", label: "Kalıp notu", type: "text", full: true, help: "örn. “Model 183cm, M giyiyor · Tam kalıp”." },
      { name: "size_chart", label: "Beden tablosu (cm)", type: "text", full: true },
      { name: "is_featured", label: "Öne çıkar", type: "boolean" },
      { name: "is_active", label: "Aktif", type: "boolean" },
      { name: "sort_order", label: "Sıra", type: "number" },
    ],
    beforeSave: async (env, values, form) => {
      const file = form.get("image_file");
      let key = "";
      if (file instanceof File && file.size > 0) key = await uploadImage(env, file);
      else key = String(form.get("image") ?? "").trim();
      values.images = JSON.stringify(key ? [key] : []);
    },
  },

  variants: {
    key: "variants",
    label: "Varyantlar",
    singular: "Varyant",
    table: "product_variants",
    icon: "layers",
    columns: ["product_id", "label", "sku", "price_modifier_minor", "stock_quantity", "sort_order", "is_active"],
    defaultSort: "product_id ASC, sort_order ASC",
    ns: [SNS.products, SNS.home],
    listColumns: [
      { name: "label", label: "Varyant" },
      { name: "sku", label: "SKU" },
      { name: "stock_quantity", label: "Kontenjan" },
      { name: "is_active", label: "Aktif" },
    ],
    fields: [
      { name: "product_id", label: "Ürün", type: "select", optionsFrom: "products", required: true },
      { name: "label", label: "Etiket", type: "text", required: true, help: "örn. “M” / “Siyah”." },
      { name: "sku", label: "SKU", type: "text" },
      { name: "price_modifier_minor", label: "Fiyat farkı (kuruş)", type: "number", help: "Taban fiyata eklenir. Varsayılan 0." },
      { name: "stock_quantity", label: "Kontenjan", type: "number" },
      { name: "sort_order", label: "Sıra", type: "number" },
      { name: "is_active", label: "Aktif", type: "boolean" },
    ],
  },
};

export const getStoreResource = (key: string): StoreResource | null => STORE_RESOURCES[key] ?? null;

function coerce(field: StoreField, raw: FormDataEntryValue | null): string | number | null {
  const s = typeof raw === "string" ? raw : "";
  switch (field.type) {
    case "boolean":
      return s === "on" || s === "1" || s === "true" ? 1 : 0;
    case "number":
      return s === "" ? 0 : parseInt(s, 10) || 0;
    case "datetime":
      return fromLocalInput(s);
    default:
      return s;
  }
}

export async function listRows(env: Env, res: StoreResource, limit = 300): Promise<Record<string, unknown>[]> {
  return all<Record<string, unknown>>(env.STORE_DB, `SELECT * FROM ${res.table} ORDER BY ${res.defaultSort} LIMIT ?`, [limit]);
}

export async function getRow(env: Env, res: StoreResource, id: string): Promise<Record<string, unknown> | null> {
  return first<Record<string, unknown>>(env.STORE_DB, `SELECT * FROM ${res.table} WHERE id = ? LIMIT 1`, [id]);
}

export async function countRows(env: Env, table: string): Promise<number> {
  const r = await first<{ n: number }>(env.STORE_DB, `SELECT COUNT(*) n FROM ${table}`);
  return r?.n ?? 0;
}

/** Resolve dynamic select options for a field that declares optionsFrom. */
export async function loadOptions(env: Env, from: "products"): Promise<{ value: string; label: string }[]> {
  void from;
  const rows = await all<{ id: string; name: string }>(env.STORE_DB, "SELECT id, name FROM products ORDER BY sort_order ASC, created_at DESC");
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function saveRow(env: Env, res: StoreResource, form: FormData): Promise<string> {
  const id = (form.get("id") as string) || uuid();
  const values: Record<string, unknown> = {};
  for (const f of res.fields) {
    if (f.virtual) continue;
    if (f.type === "image") {
      const file = form.get(`${f.name}_file`);
      if (file instanceof File && file.size > 0) {
        values[f.name] = await uploadImage(env, file);
        continue;
      }
    }
    values[f.name] = coerce(f, form.get(f.name));
  }
  if (res.fields.some((f) => f.name === "slug") && !values.slug) {
    values.slug = slugify(String(values.name || values.title || "item"));
  }
  if (res.beforeSave) await res.beforeSave(env, values, form, id);

  const cols = res.columns;
  const placeholders = ["id", ...cols, "updated_at"].map(() => "?").join(", ");
  const updates = [...cols, "updated_at"].map((c) => `${c}=excluded.${c}`).join(", ");
  const sql = `INSERT INTO ${res.table} (id, ${cols.join(", ")}, updated_at)
               VALUES (${placeholders})
               ON CONFLICT(id) DO UPDATE SET ${updates}`;
  const params = [id, ...cols.map((c) => values[c] ?? null), nowSec()];
  await run(env.STORE_DB, sql, params);
  await invalidateMany(env, res.ns);
  return id;
}

export async function deleteRow(env: Env, res: StoreResource, id: string): Promise<void> {
  await run(env.STORE_DB, `DELETE FROM ${res.table} WHERE id = ?`, [id]);
  await invalidateMany(env, res.ns);
}

/** Prefill value for a field on the edit form (handles the virtual product image). */
export function fieldValue(res: StoreResource, field: StoreField, row: Record<string, unknown> | null): unknown {
  if (!row) return undefined;
  if (field.virtual && field.name === "image") return parseImages(row.images as string)[0] ?? "";
  return row[field.name];
}
