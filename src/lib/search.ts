/**
 * Site-wide semantic search over D1 content.
 *
 * DIY stack — Workers AI (bge-m3 embeddings) + Vectorize (vector store) + KV
 * (query cache, applied by the caller). This is NOT AI Search/AutoRAG: no managed
 * instance, no R2 crawl, no generated answers. We only turn text into vectors and
 * find the nearest ones. D1 stays the source of truth; vectors are derived.
 *
 * Both bindings are optional. With no `AI`/`VECTORIZE` (e.g. `astro dev`, which
 * has no Vectorize simulation) indexing is a no-op and `search()` falls back to a
 * plain D1 LIKE scan — mirroring how `cached()` runs straight through without KV.
 * Every Vectorize call is wrapped so a hiccup can never throw into an admin save
 * or a page render.
 */

import { all } from "@/lib/db";

const EMBED_MODEL = "@cf/baai/bge-m3";

export type SearchType =
  | "posts"
  | "events"
  | "recordings"
  | "links"
  | "team"
  | "communities";

export interface SearchResult {
  type: SearchType;
  label: string; // Turkish section heading
  title: string;
  url: string;
  snippet: string;
  score: number; // 0 for LIKE fallback
}

type Row = Record<string, any>;

/** Per-type rules: how to render, where to link, and whether the row is public. */
interface TypeConfig {
  label: string;
  title: (r: Row) => string;
  text: (r: Row) => string; // what gets embedded
  snippet: (r: Row) => string;
  url: (r: Row, id: string) => string;
  published: (r: Row) => boolean;
  // D1 LIKE fallback: table, searchable columns, and the "is public" predicate.
  table: string;
  cols: string[];
  where: string;
}

const stripMd = (s: unknown): string =>
  String(s ?? "")
    .replace(/[#*_`>[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clip = (s: unknown, n: number): string => {
  const t = String(s ?? "").trim();
  return t.length > n ? t.slice(0, n) : t;
};

const isActive = (r: Row) => Number(r.is_active) === 1;
const isPublished = (r: Row) => r.status === "published";

export const TYPES: Record<SearchType, TypeConfig> = {
  posts: {
    label: "Yazılar",
    title: (r) => r.title,
    text: (r) => `${r.title}\n${r.excerpt ?? ""}`,
    snippet: (r) => clip(r.excerpt, 300),
    url: (r) => `/blog/${r.slug}`,
    published: isPublished,
    table: "posts",
    cols: ["title", "excerpt"],
    where: "status='published'",
  },
  events: {
    label: "Etkinlikler",
    title: (r) => r.title,
    text: (r) => `${r.title}\n${r.summary ?? ""}\n${stripMd(r.description)}`,
    snippet: (r) => clip(r.summary || stripMd(r.description), 300),
    url: (r) => `${r.community === "multiacademy" ? "/academy" : "/events"}/${r.slug}`,
    published: isPublished,
    table: "events",
    cols: ["title", "summary", "description"],
    where: "status='published'",
  },
  recordings: {
    label: "Kayıtlar",
    title: (r) => r.title,
    text: (r) => `${r.title}\n${r.description ?? ""}`,
    snippet: (r) => clip(r.description, 300),
    url: (_r, id) => `/recordings#rec-${id}`,
    published: isActive,
    table: "recordings",
    cols: ["title", "description"],
    where: "is_active=1",
  },
  links: {
    label: "Bağlantılar",
    title: (r) => r.label,
    text: (r) => `${r.label}\n${r.description ?? ""}`,
    snippet: (r) => clip(r.description, 300),
    url: (_r, id) => `/go/${id}`,
    published: isActive,
    table: "links",
    cols: ["label", "description"],
    where: "is_active=1",
  },
  team: {
    label: "Ekip",
    title: (r) => r.name,
    text: (r) => `${r.name}\n${r.role ?? ""}\n${r.team ?? ""}\n${r.bio ?? ""}`,
    snippet: (r) => clip([r.role, r.team].filter(Boolean).join(" · ") || r.bio, 300),
    url: (_r, id) => `/team#m-${id}`,
    published: isActive,
    table: "team_members",
    cols: ["name", "role", "team", "bio"],
    where: "is_active=1",
  },
  communities: {
    label: "Topluluklar",
    title: (r) => r.name,
    text: (r) => `${r.name}\n${r.ecosystem ?? ""}\n${r.city ?? ""}`,
    snippet: (r) => clip([r.ecosystem, r.city].filter(Boolean).join(" · "), 300),
    url: (_r, id) => `/communities#c-${id}`,
    published: isActive,
    table: "communities",
    cols: ["name", "ecosystem", "city"],
    where: "is_active=1",
  },
};

export const SEARCH_TYPES = Object.keys(TYPES) as SearchType[];

const vid = (type: SearchType, id: string) => `${type}:${id}`;

/** Embed one string with bge-m3. Returns null when AI is unavailable or errors. */
async function embed(env: Env, text: string): Promise<number[] | null> {
  if (!env.AI) return null;
  try {
    // Route through AI Gateway when configured, so every embedding call is
    // logged/metered/cost-tracked under one gateway. Falls back to a direct
    // Workers AI call if AI_GATEWAY_ID is unset.
    const options: Record<string, unknown> = {};
    if (env.AI_GATEWAY_ID) options.gateway = { id: env.AI_GATEWAY_ID };
    const res = (await env.AI.run(EMBED_MODEL, { text: [clip(text, 1500)] }, options)) as {
      data?: number[][];
    };
    const vec = res?.data?.[0];
    return Array.isArray(vec) ? vec : null;
  } catch (err) {
    console.error("[search] embed failed", err);
    return null;
  }
}

// bge-m3 accepts an array of texts per call. Batching keeps the backfill within
// the Workers subrequest cap (one embed + one upsert per chunk, not per row).
const EMBED_BATCH = 96;

async function embedMany(env: Env, texts: string[]): Promise<(number[] | null)[]> {
  if (!env.AI || !texts.length) return texts.map(() => null);
  try {
    const options: Record<string, unknown> = {};
    if (env.AI_GATEWAY_ID) options.gateway = { id: env.AI_GATEWAY_ID };
    const res = (await env.AI.run(
      EMBED_MODEL,
      { text: texts.map((t) => clip(t, 1500)) },
      options,
    )) as { data?: number[][] };
    const data = res?.data ?? [];
    return texts.map((_, i) => (Array.isArray(data[i]) ? data[i] : null));
  } catch (err) {
    console.error("[search] embedMany failed", err);
    return texts.map(() => null);
  }
}

/**
 * Upsert (or remove) the vector for one row. Called from the admin write seam.
 * A draft/inactive row deletes any existing vector so it never surfaces.
 * No-op without Vectorize; never throws. Does NOT touch the KV cache — the caller
 * invalidates `NS.search` once per write.
 */
export async function indexRow(
  env: Env,
  type: string,
  id: string,
  row: Row,
): Promise<void> {
  const cfg = TYPES[type as SearchType];
  if (!cfg || !env.VECTORIZE || !id) return;
  try {
    if (!cfg.published(row)) {
      await env.VECTORIZE.deleteByIds([vid(type as SearchType, id)]);
      return;
    }
    const vector = await embed(env, cfg.text(row));
    if (!vector) return; // embedding unavailable — leave any existing vector as-is
    await env.VECTORIZE.upsert([
      {
        id: vid(type as SearchType, id),
        values: vector,
        metadata: {
          type,
          title: clip(cfg.title(row), 200),
          url: cfg.url(row, id),
          snippet: cfg.snippet(row),
        },
      },
    ]);
  } catch (err) {
    console.error("[search] indexRow failed", type, id, err);
  }
}

/** Remove a row's vector. No-op without Vectorize; never throws. */
export async function unindexRow(
  env: Env,
  type: string,
  id: string,
): Promise<void> {
  if (!TYPES[type as SearchType] || !env.VECTORIZE || !id) return;
  try {
    await env.VECTORIZE.deleteByIds([vid(type as SearchType, id)]);
  } catch (err) {
    console.error("[search] unindexRow failed", type, id, err);
  }
}

function toResult(type: SearchType, row: Row, id: string, score: number): SearchResult {
  const cfg = TYPES[type];
  return {
    type,
    label: cfg.label,
    title: clip(cfg.title(row), 200),
    url: cfg.url(row, id),
    snippet: cfg.snippet(row),
    score,
  };
}

/**
 * Search. Semantic via Vectorize when available, else a D1 LIKE fallback.
 * Results are NOT cached here — `/api/search` wraps this in the KV cache.
 */
export async function search(
  env: Env,
  q: string,
  opts: { type?: SearchType; limit?: number } = {},
): Promise<SearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const limit = Math.min(opts.limit ?? 20, 50);

  if (env.AI && env.VECTORIZE) {
    try {
      const vector = await embed(env, query);
      if (vector) {
        const res = await env.VECTORIZE.query(vector, {
          topK: limit,
          returnMetadata: "all",
          ...(opts.type ? { filter: { type: opts.type } } : {}),
        });
        const matches = res?.matches ?? [];
        if (matches.length) {
          return matches
            .map((m) => {
              const md = (m.metadata ?? {}) as Record<string, unknown>;
              const type = String(md.type ?? "") as SearchType;
              if (!TYPES[type]) return null;
              return {
                type,
                label: TYPES[type].label,
                title: String(md.title ?? ""),
                url: String(md.url ?? ""),
                snippet: String(md.snippet ?? ""),
                score: m.score ?? 0,
              } satisfies SearchResult;
            })
            .filter((r): r is SearchResult => r !== null);
        }
        return [];
      }
    } catch (err) {
      console.error("[search] semantic query failed, using LIKE fallback", err);
    }
  }

  return likeFallback(env, query, limit, opts.type);
}

/** Keyword fallback when AI/Vectorize is unavailable (local dev, budget exhausted). */
async function likeFallback(
  env: Env,
  q: string,
  limit: number,
  type?: SearchType,
): Promise<SearchResult[]> {
  const like = `%${q.replace(/[%_\\]/g, "")}%`;
  const types = type ? [type] : SEARCH_TYPES;
  const perType = Math.max(3, Math.ceil(limit / types.length));
  const out: SearchResult[] = [];

  for (const t of types) {
    const cfg = TYPES[t];
    const clause = cfg.cols.map((c) => `${c} LIKE ?`).join(" OR ");
    try {
      const rows = await all<Row>(
        env.DB,
        `SELECT * FROM ${cfg.table} WHERE ${cfg.where} AND (${clause}) LIMIT ?`,
        [...cfg.cols.map(() => like), perType],
      );
      for (const r of rows) out.push(toResult(t, r, String(r.id), 0));
    } catch (err) {
      console.error("[search] LIKE fallback failed for", t, err);
    }
  }
  return out.slice(0, limit);
}

/**
 * Backfill: embed & upsert every published/active row. Use after first deploy and
 * after any direct D1 seed (which bypasses the write seam). Returns a per-type count.
 */
export async function reindexAll(env: Env): Promise<{ type: SearchType; indexed: number }[]> {
  const summary: { type: SearchType; indexed: number }[] = [];
  for (const t of SEARCH_TYPES) {
    const cfg = TYPES[t];
    const rows = await all<Row>(env.DB, `SELECT * FROM ${cfg.table} WHERE ${cfg.where}`);
    let indexed = 0;
    for (let i = 0; i < rows.length; i += EMBED_BATCH) {
      const chunk = rows.slice(i, i + EMBED_BATCH);
      const vecs = await embedMany(env, chunk.map((r) => cfg.text(r)));
      const vectors = [];
      for (let j = 0; j < chunk.length; j++) {
        const v = vecs[j];
        if (!v) continue;
        const r = chunk[j];
        const id = String(r.id);
        vectors.push({
          id: vid(t, id),
          values: v,
          metadata: {
            type: t,
            title: clip(cfg.title(r), 200),
            url: cfg.url(r, id),
            snippet: cfg.snippet(r),
          },
        });
      }
      if (vectors.length && env.VECTORIZE) {
        await env.VECTORIZE.upsert(vectors);
        indexed += vectors.length;
      }
    }
    summary.push({ type: t, indexed });
  }
  return summary;
}
