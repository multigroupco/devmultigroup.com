import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Resolves a YouTube playlist's cover (its first video's thumbnail) WITHOUT the
// Data API: fetch the playlist page once, scrape the first videoId, cache it in
// KV for a week, then 302 to the i.ytimg thumbnail. <img> follows the redirect.
const VID_RE = /"videoId":"([A-Za-z0-9_-]{11})"/;

export const GET: APIRoute = async ({ params, locals }) => {
  const env = getEnv(locals);
  const id = params.id;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });

  const key = `yt:firstvid:${id}`;
  let vid = await env.CACHE.get(key);

  if (!vid) {
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${id}&hl=en`, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          cookie: "CONSENT=YES+1",
        },
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(VID_RE);
        if (m) {
          vid = m[1];
          await env.CACHE.put(key, vid, { expirationTtl: 60 * 60 * 24 * 7 });
        }
      }
    } catch {
      /* network/parse failure → fall through to 404 so the card shows its placeholder */
    }
  }

  if (!vid) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: {
      location: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      "cache-control": "public, max-age=86400",
    },
  });
};
