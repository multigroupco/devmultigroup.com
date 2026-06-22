import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Streams objects from the store R2 bucket (STORE_MEDIA). Product images are
// referenced as bare keys and served here with long-lived immutable caching —
// the store twin of /media/[...key].ts.
export const GET: APIRoute = async ({ params, locals }) => {
  const env = getEnv(locals);
  const key = params.key;
  if (!key) return new Response("Not found", { status: 404 });

  const obj = await env.STORE_MEDIA.get(key);
  if (!obj || !obj.body) return new Response("Not found", { status: 404 });

  // Read httpMetadata directly (POJO); obj.writeHttpMetadata fails across platformProxy.
  const headers = new Headers();
  headers.set("content-type", obj.httpMetadata?.contentType || "application/octet-stream");
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};
