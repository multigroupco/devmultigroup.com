import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { uuid, nowSec } from "@/lib/db";

// Admin-only image upload for the markdown editor (paste / drag-drop). It lives
// under /admin so Cloudflare Access + the middleware guard already protect it.
// Returns the public /media URL to splice into the post body.
export const prerender = false;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return json({ error: "Dosya yok." }, 400);
    if (!file.type.startsWith("image/")) return json({ error: "Sadece görseller." }, 415);
    if (file.size > 8 * 1024 * 1024) return json({ error: "En fazla 8MB." }, 413);

    const ext = EXT[file.type] || "bin";
    const key = `uploads/${nowSec()}-${uuid().slice(0, 8)}.${ext}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    return json({ ok: true, key, url: `/media/${key}` });
  } catch {
    return json({ error: "Yükleme başarısız." }, 500);
  }
};
