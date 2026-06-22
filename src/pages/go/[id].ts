import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { first, run } from "@/lib/db";
import { captureServer } from "@/lib/analytics-server";
import { EVENTS } from "@/lib/events";

// Outbound link redirector with click counting (used by the /links page).
export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = getEnv(locals);
  const id = params.id;
  const link = id
    ? await first<{ url: string }>(env.DB, "SELECT url FROM links WHERE id=? AND is_active=1", [id])
    : null;

  if (!link) {
    return new Response(null, { status: 302, headers: { location: "/links" } });
  }

  const update = run(env.DB, "UPDATE links SET clicks = clicks + 1 WHERE id=?", [id]);
  // Server-side analytics mirror of the click (the browser fires link_click too).
  const track = captureServer(env, EVENTS.linkRedirect, {
    request,
    properties: { link_id: id, destination_url: link.url },
  });
  const ctx = (locals as App.Locals).runtime?.ctx;
  if (ctx?.waitUntil) {
    ctx.waitUntil(update);
    ctx.waitUntil(track);
  } else {
    await Promise.all([update, track]);
  }

  return new Response(null, {
    status: 302,
    headers: { location: link.url, "cache-control": "no-store" },
  });
};
