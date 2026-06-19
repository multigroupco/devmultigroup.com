// Small helpers around D1 + id/slug/time utilities.

export const nowSec = (): number => Math.floor(Date.now() / 1000);

export const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/** URL-safe slug; transliterates Turkish characters so titles round-trip. */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u",
  };
  return input
    .trim()
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

/** Run a query and return all rows typed as T. */
export async function all<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const res = await stmt.all<T>();
  return (res.results ?? []) as T[];
}

/** Run a query and return the first row, or null. */
export async function first<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const res = await stmt.first<T>();
  return (res as T) ?? null;
}

/** Run a write; returns d1 meta. */
export async function run(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<D1Result> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.run();
}

export const csv = (s: string | null | undefined): string[] =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export const bool = (n: number | null | undefined): boolean => Number(n) === 1;
