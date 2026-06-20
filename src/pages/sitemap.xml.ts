import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { all } from "@/lib/db";
import { imageSrc } from "@/lib/ui";
import { BRAND } from "@/lib/site";

const STATIC: { path: string; priority: string }[] = [
  { path: "/", priority: "1.0" },
  { path: "/events", priority: "0.8" },
  { path: "/academy", priority: "0.8" },
  { path: "/recordings", priority: "0.7" },
  { path: "/blog", priority: "0.7" },
  { path: "/team", priority: "0.6" },
  { path: "/communities", priority: "0.6" },
  { path: "/partnerships", priority: "0.6" },
  { path: "/about", priority: "0.6" },
  { path: "/links", priority: "0.4" },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async (context) => {
  const env = getEnv(context.locals);
  const origin = (context.site?.origin ?? BRAND.url).replace(/\/$/, "");

  type Row = { slug: string; updated_at: number; cover_image: string; title: string; community?: string };
  let posts: Row[] = [];
  let events: Row[] = [];
  try {
    posts = await all<Row>(env.DB, "SELECT slug, updated_at, cover_image, title FROM posts WHERE status='published'");
  } catch { /* table empty/missing */ }
  try {
    events = await all<Row>(env.DB, "SELECT slug, updated_at, cover_image, title, community FROM events WHERE status='published'");
  } catch { /* table empty/missing */ }

  const iso = (s: number) => new Date(s * 1000).toISOString();
  const absImage = (img: string) => {
    if (!img) return "";
    const s = imageSrc(img);
    return s.startsWith("http") ? s : origin + s;
  };

  // Freshest content timestamp → a real lastmod for the otherwise-static section pages.
  const mods = [...posts, ...events].map((r) => r.updated_at).filter(Boolean);
  const siteLastmod = iso(mods.length ? Math.max(...mods) : Math.floor(Date.now() / 1000));

  const urlEntry = (loc: string, lastmod: string, priority: string, img = "", title = "") => {
    const image = img
      ? `<image:image><image:loc>${esc(img)}</image:loc><image:title>${esc(title)}</image:title></image:image>`
      : "";
    return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority>${image}</url>`;
  };

  const entries = [
    ...STATIC.map((s) => urlEntry(`${origin}${s.path === "/" ? "" : s.path}`, siteLastmod, s.priority)),
    ...events.map((e) => urlEntry(`${origin}${e.community === "multiacademy" ? "/academy" : "/events"}/${e.slug}`, iso(e.updated_at), "0.6", absImage(e.cover_image), e.title)),
    ...posts.map((p) => urlEntry(`${origin}/blog/${p.slug}`, iso(p.updated_at), "0.6", absImage(p.cover_image), p.title)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join("\n")}\n</urlset>`;
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=1800",
    },
  });
};
