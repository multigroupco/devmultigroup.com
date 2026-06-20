import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { cached, NS } from "@/lib/cache";
import { search, TYPES, type SearchType } from "@/lib/search";

const json = (data: unknown, cache = "public, max-age=30") =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
    },
  });

// GET /api/search?q=<query>&type=<optional content type>
// Returns { q, results: SearchResult[] }. Semantic (Vectorize) when available,
// D1 LIKE fallback otherwise. Results are KV-cached under NS.search (5 min TTL,
// busted whenever any searchable row is written).
export const GET: APIRoute = async ({ locals, url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  const typeParam = url.searchParams.get("type") ?? "";
  const type = (typeParam in TYPES ? typeParam : undefined) as SearchType | undefined;

  if (q.length < 2) return json({ q, results: [] });

  const env = tryEnv(locals);
  if (!env) return json({ q, results: [] });

  const key = `q:${type ?? "all"}:${q.toLowerCase()}`;
  // Cache only non-empty result sets (5 min) — never pin an empty result, which
  // could otherwise stick for a query run during the index's consistency window.
  const results = await cached(
    env,
    NS.search,
    key,
    () => search(env, q, { type }),
    300,
    (r) => Array.isArray(r) && r.length > 0,
  );

  return json({ q, results });
};
