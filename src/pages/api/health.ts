import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";

/**
 * Deep health probe, consumed by Argus (status.devmultigroup.com).
 *
 * A 200 from the homepage only proves the Worker booted and that the KV cache
 * had a warm copy. This proves the bindings behind it — three D1 databases, KV,
 * R2 — are reachable RIGHT NOW, which is the difference between a status page
 * that catches an outage and one that learns about it from a user.
 *
 * Public and unauthenticated by design, and therefore leaks nothing: fixed
 * reason codes, never the underlying exception, never a hostname or key.
 *
 * Contract (shared across every MultiGroup service):
 *   { status: "ok" | "degraded" | "down", service, ts, checks: [{name, ok, ms, note?}] }
 *   - a REQUIRED check failing  → "down"
 *   - an optional check failing → "degraded"
 */
interface Check {
  name: string;
  ok: boolean;
  ms: number;
  note?: string;
  required: boolean;
}

async function timed(
  name: string,
  required: boolean,
  fn: () => Promise<void>,
  failNote: string,
): Promise<Check> {
  const t0 = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - t0, required };
  } catch {
    return { name, ok: false, ms: Date.now() - t0, note: failNote, required };
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const env = tryEnv(locals);
  if (!env) {
    return json({
      status: "down",
      service: "devmultigroup-web",
      ts: now(),
      checks: [{ name: "runtime", ok: false, ms: 0, note: "bindings unavailable" }],
    });
  }

  // Concurrent: a health endpoint that serialises five round-trips is itself a
  // latency problem.
  const checks = await Promise.all([
    // The content DB is the site. Without it every page falls back to defaults.
    timed("d1:content", true, async () => {
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM settings").first<{ n: number }>();
      if (!r) throw new Error("bad result");
    }, "query failed"),

    // The store is a separate database on purpose; losing it costs commerce,
    // not the site — hence not required.
    timed("d1:store", false, async () => {
      const r = await env.STORE_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      if (r?.ok !== 1) throw new Error("bad result");
    }, "query failed"),

    // Newsletter sign-ups write here; the rest of the site does not read it.
    timed("d1:mail", false, async () => {
      const r = await env.MAIL_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      if (r?.ok !== 1) throw new Error("bad result");
    }, "query failed"),

    timed("kv:cache", true, async () => {
      // A read costs nothing; a write would pollute the namespace every minute.
      await env.CACHE.get("__health");
    }, "read failed"),

    // Content images live in R2 and are served through /media/<key>.
    timed("r2:media", true, async () => {
      await env.MEDIA.head("__health_probe");
    }, "head failed"),
  ]);

  // Semantic search degrades to a D1 LIKE scan without these — worth reporting,
  // not worth turning the site red.
  checks.push({
    name: "search:vectorize",
    ok: !!env.VECTORIZE && !!env.AI,
    ms: 0,
    required: false,
    note: env.VECTORIZE && env.AI ? undefined : "unbound",
  });

  checks.push({
    name: "config:warden",
    ok: !!env.WARDEN_CLIENT_ID && !!env.WARDEN_CLIENT_SECRET && !!env.WARDEN_ISSUER,
    ms: 0,
    required: false, // only /admin needs it; the public site does not
    note: env.WARDEN_CLIENT_ID && env.WARDEN_CLIENT_SECRET && env.WARDEN_ISSUER ? undefined : "incomplete",
  });

  return json(summarise("devmultigroup-web", checks));
};

const now = () => Math.floor(Date.now() / 1000);

function summarise(service: string, checks: Check[]) {
  const down = checks.some((c) => c.required && !c.ok);
  const degraded = checks.some((c) => !c.required && !c.ok);
  return {
    status: down ? "down" : degraded ? "degraded" : "ok",
    service,
    ts: now(),
    checks: checks.map(({ name, ok, ms, note }) => ({ name, ok, ms, ...(note ? { note } : {}) })),
  };
}

function json(body: unknown): Response {
  // Always 200: the BODY carries the verdict, so a checker can tell "the app is
  // down" apart from "the app answered and says a dependency is down".
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "access-control-allow-origin": "*",
    },
  });
}

export const prerender = false;
