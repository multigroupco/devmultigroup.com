// Store data helpers. The store lives in a SEPARATE D1 (env.STORE_DB) and a
// separate R2 bucket (env.STORE_MEDIA), but reuses the repo's house helpers and
// the version-stamped KV cache. Pages read via lib/store/catalog.ts (cached);
// writes go through lib/store/admin.ts + lib/store/orders.ts.

export { all, first, run, uuid, nowSec, slugify } from "../db";

/** Cache namespaces for the store (kept distinct from the content NS map). */
export const SNS = {
  drops: "store:drops",
  products: "store:products",
  home: "store:home",
} as const;

/** Parse a stored images value: a JSON array, or a comma list, → string[]. */
export function parseImages(raw: string | null | undefined): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
    } catch {
      /* fall through to CSV */
    }
  }
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Resolve a store image value to a served URL. Bare keys → /store/media/<key>. */
export function storeImageSrc(value: string | null | undefined): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return `/store/media/${v}`;
}
