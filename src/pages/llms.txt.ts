import type { APIRoute } from "astro";
import { tryEnv } from "@/lib/runtime";
import { getStats, getSettings } from "@/lib/content";
import { resolveSite, BRAND, SOCIALS } from "@/lib/site";

// GEO: a concise, link-rich map for answer engines (ChatGPT, Claude, Perplexity…).
// Depth lives in /llms-full.txt — this stays a navigable index with the hard facts
// that make a passage quotable.
export const GET: APIRoute = async (context) => {
  const o = (context.site?.origin ?? BRAND.url).replace(/\/$/, "");

  let members = "15.000+";
  let events = "100+";
  let companies = "25+";
  const env = tryEnv(context.locals);
  if (env) {
    try {
      const [, settings] = await Promise.all([getStats(env), getSettings(env)]);
      const site = resolveSite(settings);
      members = site.members;
      events = site.events;
      companies = site.companies;
    } catch { /* pre-seed: keep defaults */ }
  }

  const s = SOCIALS.multigroup;
  const body = `# ${BRAND.name}

> ${BRAND.tagline}. ${BRAND.description}

Developer MultiGroup (DevMultiGroup, "MultiGroup") is a Turkish developer
community, active since 2020 and based in İstanbul, Türkiye. It spans mobile/iOS,
web, AI/GenAI, game development, Web3 and career growth, running free meetups,
conferences and workshops. Its learning arm, MultiAcademy, delivers free,
mentor-led bootcamps. Scale: ${members} members, ${events} events, ${companies} partner
companies (incl. Google, Trendyol, Hepsiburada, Akbank). Content is in Turkish (tr-TR).

## Key pages
- [Home](${o}/): overview of the community.
- [Events](${o}/events): upcoming and past meetups, conferences and workshops. Registration happens on Gathin.
- [Academy](${o}/academy): MultiAcademy free bootcamps (Modern iOS, Android/Compose, GenAI fundamentals, web). Also at academy.devmultigroup.com.
- [Recordings](${o}/recordings): YouTube playlists of talks and bootcamp series.
- [Blog](${o}/blog): articles, guides and event recaps. Feed: ${o}/rss.xml
- [Team](${o}/team): organizers and volunteers.
- [Communities](${o}/communities): partner communities and ecosystems (Google, Huawei, Amazon, IEEE) across Türkiye.
- [Companies](${o}/companies): brands and partners the community builds with.
- [About](${o}/about): mission, values and FAQ (what it is, whether events are free, how to join).
- [Links](${o}/links): all official links in one place.

## Social
- Instagram: ${s.instagram}
- X/Twitter: ${s.twitter}
- LinkedIn: ${s.linkedin}
- YouTube: ${s.youtube}
- GitHub: ${s.github}
- Academy Instagram: ${SOCIALS.multiacademy.instagram}

## Notes
- Events are free to join unless stated otherwise.
- Founded 2020 · İstanbul, Türkiye · language Turkish (tr-TR).
- Contact: ${BRAND.email}

## Optional
- [Full content](${o}/llms-full.txt): community overview + latest blog posts as markdown.
- [Sitemap](${o}/sitemap.xml)
- [RSS feed](${o}/rss.xml)
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
