import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { listPosts, getSettings } from "@/lib/content";
import { resolveSite, BRAND, SOCIALS } from "@/lib/site";

// GEO: the full-content companion to /llms.txt. A single self-contained markdown
// document an answer engine can read without crawling — community overview, focus
// areas, MultiAcademy tracks, hard facts, and the latest blog posts (built live
// from D1 so it stays current without a redeploy).
export const GET: APIRoute = async (context) => {
  const o = (context.site?.origin ?? BRAND.url).replace(/\/$/, "");

  let members = "15.000+";
  let events = "100+";
  let companies = "25+";
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  const env = tryEnv(context.locals);
  if (env) {
    try {
      const settings = await getSettings(env);
      const site = resolveSite(settings);
      members = site.members;
      events = site.events;
      companies = site.companies;
    } catch { /* keep defaults */ }
    try {
      posts = await listPosts(env, { limit: 20 });
    } catch { /* pre-seed */ }
  }

  const postLines = posts
    .map((p) => {
      const date = new Date((p.published_at ?? p.created_at) * 1000).toISOString().slice(0, 10);
      const sum = (p.seo_description || p.excerpt || "").replace(/\s+/g, " ").trim();
      return `### ${p.title}\n${date}${p.author ? ` · ${p.author}` : ""} · ${o}/blog/${p.slug}\n${sum}`;
    })
    .join("\n\n");

  const body = `# ${BRAND.name} — Full Content

${BRAND.tagline}.

## What it is
Developer MultiGroup (DevMultiGroup, "MultiGroup") is a Turkish volunteer developer
community, active since 2020 and based in İstanbul, Türkiye. It brings developers
together through free meetups, conferences and workshops, and grows alongside a
network of partner communities and companies. Its learning arm, MultiAcademy, runs
free, mentor-led, project-based bootcamps. All content and events are in Turkish; the
only fixed English string is the motto "${BRAND.tagline}".

## Facts
- Founded: 2020
- Location: İstanbul, Türkiye (also fully online events)
- Members: ${members}
- Events: ${events}
- Partner companies: ${companies} (incl. Google, Trendyol, Hepsiburada, Akbank, Softtech, Teknasyon, Wite, Lodos)
- Cost: free to join unless stated otherwise
- Language: Turkish (tr-TR)
- Contact: ${BRAND.email}

## Focus areas
Mobile / iOS, web, AI / GenAI, game development, Web3, and career growth.

## MultiAcademy bootcamps (free)
- Modern iOS — SwiftUI, architecture and shipping to the App Store.
- Android · Compose — from XML to modern Android with Jetpack Compose.
- GenAI Temelleri — LLMs, prompting and agents with Google Gemini.
- Web Temelleri — from the browser to production-grade apps.
Site: https://academy.devmultigroup.com

## Official links
- Website: ${o}/
- Events (register on Gathin): ${o}/events
- Blog: ${o}/blog (RSS: ${o}/rss.xml)
- Recordings (YouTube): ${o}/recordings
- Instagram: ${SOCIALS.multigroup.instagram}
- X/Twitter: ${SOCIALS.multigroup.twitter}
- LinkedIn: ${SOCIALS.multigroup.linkedin}
- YouTube: ${SOCIALS.multigroup.youtube}
- GitHub: ${SOCIALS.multigroup.github}

## Latest blog posts
${postLines || "(no posts yet)"}
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
