import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Streams objects from the R2 MEDIA bucket. Uploaded gallery / cover images are
// referenced as bare keys and served here with long-lived immutable caching.
export const GET: APIRoute = async ({ params, locals }) => {
  const env = getEnv(locals);
  const key = params.key;
  if (!key) return new Response("Not found", { status: 404 });

  const obj = await env.MEDIA.get(key);
  if (!obj || !obj.body) return new Response("Not found", { status: 404 });

  // Read httpMetadata directly (a POJO) instead of obj.writeHttpMetadata(headers),
  // which fails across the local platformProxy boundary ("Cannot stringify non-POJOs").
  const headers = new Headers();
  headers.set("content-type", obj.httpMetadata?.contentType || "application/octet-stream");
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};
