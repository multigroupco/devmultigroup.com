/**
 * Version-stamped read-through cache over Workers KV.
 *
 * Every cached read is keyed `c:<ns>:<version>:<key>`. To invalidate a
 * namespace we simply bump its integer version — every old key becomes
 * unreachable and expires on its TTL. No key enumeration, no purge API,
 * and reads after a write are guaranteed fresh (new version → cache miss).
 */

const DEFAULT_TTL = 600; // seconds — bounds orphaned-key lifetime only

const versionKey = (ns: string) => `cv:${ns}`;
const dataKey = (ns: string, v: string, key: string) => `c:${ns}:${v}:${key}`;

async function currentVersion(cache: KVNamespace, ns: string): Promise<string> {
  return (await cache.get(versionKey(ns))) ?? "1";
}

/** Read through the cache; on miss, run `loader`, store and return it. */
export async function cached<T>(
  env: Env | null,
  ns: string,
  key: string,
  loader: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  shouldCache?: (data: T) => boolean,
): Promise<T> {
  const cache = env?.CACHE;
  if (!cache) return loader(); // no KV bound (e.g. bare unit test) → straight through

  const v = await currentVersion(cache, ns);
  const k = dataKey(ns, v, key);

  const hit = await cache.get(k);
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      /* corrupt entry — fall through and refresh */
    }
  }

  const data = await loader();
  // Don't cache empty/undefined payloads as authoritative. Callers can refine
  // with `shouldCache` — e.g. search skips caching empty result sets so a query
  // run during Vectorize's eventual-consistency window can't pin a stale "no
  // results" for the whole TTL.
  const storable =
    data !== undefined && data !== null && (shouldCache ? shouldCache(data) : true);
  if (storable) {
    await cache.put(k, JSON.stringify(data), { expirationTtl: ttl });
  }
  return data;
}

/** Invalidate one namespace by bumping its version. */
export async function invalidate(env: Env | null, ns: string): Promise<void> {
  const cache = env?.CACHE;
  if (!cache) return;
  const next = parseInt((await cache.get(versionKey(ns))) ?? "1", 10) + 1;
  await cache.put(versionKey(ns), String(next));
}

/** Invalidate several namespaces (used after admin writes). */
export async function invalidateMany(
  env: Env | null,
  namespaces: string[],
): Promise<void> {
  await Promise.all(namespaces.map((ns) => invalidate(env, ns)));
}

/** Namespaces used across the app. "home" is the aggregate landing payload. */
export const NS = {
  settings: "settings",
  events: "events",
  posts: "posts",
  links: "links",
  recordings: "recordings",
  gallery: "gallery",
  team: "team",
  social: "social",
  home: "home",
  communities: "communities",
  search: "search",
} as const;
