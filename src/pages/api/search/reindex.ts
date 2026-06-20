import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { invalidate, NS } from "@/lib/cache";
import { reindexAll } from "@/lib/search";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Token-guarded backfill for automation / one-off ops. Lives under /api (NOT
// behind Cloudflare Access, which only admits interactive logins with an email
// header), so it authenticates with a bearer token instead:
//   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<host>/api/search/reindex
// Set the secret with `wrangler secret put ADMIN_TOKEN`. The Access-gated
// /admin/search/reindex is the browser equivalent; both run the same idempotent
// reindexAll() (embed + upsert every published/active row into Vectorize).
async function handle(request: Request, locals: App.Locals): Promise<Response> {
  const env = tryEnv(locals);
  if (!env) return json({ ok: false, error: "runtime env unavailable" }, 500);

  const token = env.ADMIN_TOKEN;
  if (!token) return json({ ok: false, error: "ADMIN_TOKEN not configured on this Worker" }, 503);

  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  // length check first to keep the compare cheap; exact-match required.
  if (provided.length !== token.length || provided !== token) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (!env.AI || !env.VECTORIZE) {
    return json({ ok: false, error: "AI/Vectorize binding unavailable" }, 503);
  }

  const started = Date.now();
  const summary = await reindexAll(env);
  await invalidate(env, NS.search);
  const total = summary.reduce((n, s) => n + s.indexed, 0);
  return json({ ok: true, total, ms: Date.now() - started, summary });
}

export const POST: APIRoute = ({ request, locals }) => handle(request, locals);
export const GET: APIRoute = ({ request, locals }) => handle(request, locals);
