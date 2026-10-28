import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { listEvents } from "@/lib/content";

/**
 * Published events as a slim list (slug, title, start date) — read by Creed
 * (creed.devmultigroup.com) so an album can be bound to an event by picking it,
 * not by typing a slug (a typo would silently orphan the photos, ADR 0004).
 * Public data only: everything here is already on /events.
 */
export const GET: APIRoute = async ({ locals }) => {
  const env = tryEnv(locals);
  const events = env ? await listEvents(env, { limit: 1000 }).catch(() => []) : [];
  return new Response(
    JSON.stringify({
      events: events.map((e) => ({
        slug: e.slug,
        title: e.title,
        starts_at: e.starts_at ? new Date(e.starts_at * 1000).toISOString() : null,
      })),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=600",
      },
    },
  );
};

export const prerender = false;
