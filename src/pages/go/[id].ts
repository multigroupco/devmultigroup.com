import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { first, run } from "@/lib/db";

// Outbound link redirector with click counting (used by /links and
// /academy-links). Ids are uuids and the two tables never collide, so we look in
// `links` first and fall back to `academy_links`.
const TABLES = ["links", "academy_links"] as const;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = getEnv(locals);
  const id = params.id;

  let link: { url: string } | null = null;
  let table: (typeof TABLES)[number] | null = null;
  if (id) {
    for (const t of TABLES) {
      link = await first<{ url: string }>(
        env.DB,
        `SELECT url FROM ${t} WHERE id=? AND is_active=1`,
        [id],
      );
      if (link) {
        table = t;
        break;
      }
    }
  }

  if (!link || !table) {
    return new Response(null, { status: 302, headers: { location: "/links" } });
  }

  const update = run(env.DB, `UPDATE ${table} SET clicks = clicks + 1 WHERE id=?`, [id]);
  const ctx = (locals as App.Locals).runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(update);
  else await update;

  return new Response(null, {
    status: 302,
    headers: { location: link.url, "cache-control": "no-store" },
  });
};

export const prerender = false;
