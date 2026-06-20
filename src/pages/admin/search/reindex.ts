import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { invalidate, NS } from "@/lib/cache";
import { reindexAll } from "@/lib/search";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// /admin/search/reindex — admin-only (Cloudflare Access guards every /admin* path;
// the dev middleware bypass makes it reachable locally, but AI/Vectorize have no
// local simulation so it returns 503 there — run it against the deployed Worker).
//
// Idempotent backfill: embeds & upserts every published/active row into Vectorize.
// Run once after the first deploy, and again after any direct D1 seed (seeds bypass
// the saveRow write-seam, so the index won't otherwise know about them).
async function handle(locals: App.Locals): Promise<Response> {
  const env = tryEnv(locals);
  if (!env) return json({ ok: false, error: "runtime env unavailable" }, 500);
  if (!env.AI || !env.VECTORIZE) {
    return json(
      {
        ok: false,
        error:
          "AI/Vectorize binding unavailable — expected in local dev. Run this against the deployed Worker.",
      },
      503,
    );
  }

  const started = Date.now();
  const summary = await reindexAll(env);
  await invalidate(env, NS.search);
  const total = summary.reduce((n, s) => n + s.indexed, 0);
  return json({ ok: true, total, ms: Date.now() - started, summary });
}

export const GET: APIRoute = ({ locals }) => handle(locals);
export const POST: APIRoute = ({ locals }) => handle(locals);
