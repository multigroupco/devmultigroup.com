import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { first, run } from "@/lib/db";

// Outbound link redirector with click counting (used by the /links page).
export const GET: APIRoute = async ({ params, locals }) => {
  const env = getEnv(locals);
  const id = params.id;
  const link = id
    ? await first<{ url: string }>(env.DB, "SELECT url FROM links WHERE id=? AND is_active=1", [id])
    : null;

  if (!link) {
    return new Response(null, { status: 302, headers: { location: "/links" } });
  }

  const update = run(env.DB, "UPDATE links SET clicks = clicks + 1 WHERE id=?", [id]);
  const ctx = (locals as App.Locals).runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(update);
  else await update;

  return new Response(null, {
    status: 302,
    headers: { location: link.url, "cache-control": "no-store" },
  });
};
