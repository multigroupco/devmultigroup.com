import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getEnv } from "@/lib/runtime";
import { listPosts } from "@/lib/content";
import { csv } from "@/lib/db";
import { BRAND } from "@/lib/site";

export async function GET(context: APIContext) {
  const env = getEnv(context.locals);
  let posts = [] as Awaited<ReturnType<typeof listPosts>>;
  try {
    posts = await listPosts(env, { limit: 40 });
  } catch { /* pre-seed */ }

  return rss({
    title: `${BRAND.name} — Blog`,
    description: BRAND.description,
    site: context.site ?? BRAND.url,
    items: posts.map((p) => ({
      title: p.title,
      description: p.excerpt,
      link: `/blog/${p.slug}`,
      pubDate: new Date((p.published_at ?? p.created_at) * 1000),
      categories: csv(p.tags),
    })),
    customData: "<language>tr-TR</language>",
  });
}
