/**
 * Gathin RSS import (#7).
 *
 * Gathin publishes an undocumented but live per-community feed at
 * `https://gathin.com/communities/<community-id>/rss.xml` (discoverable via a
 * `<link rel="alternate" type="application/rss+xml">` on the community page).
 *
 * CREATE-ONLY, BY DECISION. The first time we see a `<guid>` we insert a DRAFT
 * event; from then on that guid is skipped forever. A re-run can never rewrite
 * a title, summary or description — those get hand-polished, and a background
 * job must not be able to clobber them.
 *
 * The accepted cost: if Gathin reschedules or renames an event, this importer
 * will NOT propagate the change and will not warn. Dates on already-imported
 * rows are maintained by hand.
 *
 * What the feed gives us per item:
 *   title, link (→ registration_url), guid (→ events.external_id, the dedupe
 *   key), pubDate (→ starts_at), category (always the literal "event"),
 *   description (long marketing prose), enclosure@url (cover image).
 * What it does NOT give: venue, city, online/offline, end time, our internal
 * category, or tags. Those stay empty and are filled in at /admin/events before
 * publishing — which is exactly why rows land as drafts.
 */

import { all, run, uuid, nowSec, slugify } from "./db";
import { invalidateMany, NS } from "./cache";
import { reportBackground } from "./sentry";
import type { Community } from "./types";

const FEEDS: Record<Community, string> = {
  multigroup:
    "https://gathin.com/communities/multigroup-community-34813861558366504236/rss.xml",
  multiacademy:
    "https://gathin.com/communities/multiacademy-community-94761667282726876508/rss.xml",
};

export interface GathinItem {
  guid: string;
  title: string;
  link: string;
  pubDate: number | null;
  description: string;
  image: string;
}

export interface SyncReport {
  community: Community;
  fetched: number;
  created: number;
  skipped: number;
  error?: string;
  titles: string[];
}

/* ── parsing ──────────────────────────────────────────────────────────────── */

const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Pull one tag's text, unwrapping CDATA. Feeds here are single-line, so the
 *  `s` flag matters; we deliberately do NOT pull in an XML parser dependency. */
function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
}

function attr(xml: string, tagName: string, attrName: string): string {
  const m = xml.match(new RegExp(`<${tagName}[^>]*\\b${attrName}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

export function parseFeed(xml: string): GathinItem[] {
  const items: GathinItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const guid = tag(block, "guid");
    const title = tag(block, "title");
    if (!guid || !title) continue;
    const pub = tag(block, "pubDate");
    const ms = pub ? Date.parse(pub) : NaN;
    items.push({
      guid,
      title,
      link: tag(block, "link"),
      pubDate: Number.isNaN(ms) ? null : Math.floor(ms / 1000),
      description: tag(block, "description"),
      image: attr(block, "enclosure", "url"),
    });
  }
  return items;
}

/** Strip the marketing prose down to something usable as a card teaser. */
const teaser = (s: string, n = 200): string => {
  const flat = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (flat.length <= n) return flat;
  return flat.slice(0, n).replace(/\s+\S*$/, "") + "…";
};

/* ── cover images ─────────────────────────────────────────────────────────── */

/**
 * Copy the cover into R2 rather than hotlinking it. The `enclosure` URL points
 * at `files-01.apiollon.com` WITH a `token` query param — that link will rot,
 * and a rotted cover on a published event page is worse than no cover.
 * Returns the R2 key, or "" when the copy fails (never throws: a missing cover
 * must not abort the import).
 */
async function mirrorCover(env: Env, url: string, slug: string): Promise<string> {
  if (!url || !env.MEDIA) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const type = res.headers.get("content-type") || "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const key = `events/${slug}.${ext}`;
    await env.MEDIA.put(key, await res.arrayBuffer(), {
      httpMetadata: { contentType: type },
    });
    return key;
  } catch (err) {
    reportBackground(env, err, { area: "gathin/mirrorCover" });
    return "";
  }
}

/* ── sync ─────────────────────────────────────────────────────────────────── */

async function syncOne(env: Env, community: Community): Promise<SyncReport> {
  const report: SyncReport = {
    community,
    fetched: 0,
    created: 0,
    skipped: 0,
    titles: [],
  };

  let xml: string;
  try {
    const res = await fetch(FEEDS[community], {
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) {
      report.error = `Feed ${res.status}`;
      return report;
    }
    xml = await res.text();
  } catch (err) {
    reportBackground(env, err, { area: "gathin/fetch" });
    report.error = "Feed'e ulaşılamadı";
    return report;
  }

  const items = parseFeed(xml);
  report.fetched = items.length;
  if (!items.length) return report;

  // One round-trip for every guid we already hold. `external_id` is the only
  // thing that decides "new"; slug collisions are handled separately below.
  const known = new Set(
    (
      await all<{ external_id: string }>(
        env.DB,
        `SELECT external_id FROM events WHERE external_id <> ''`,
      )
    ).map((r) => r.external_id),
  );
  const slugs = new Set(
    (await all<{ slug: string }>(env.DB, `SELECT slug FROM events`)).map((r) => r.slug),
  );

  for (const item of items) {
    if (known.has(item.guid)) {
      report.skipped++;
      continue;
    }

    let slug = slugify(item.title);
    if (slugs.has(slug)) slug = `${slug}-${item.guid.slice(-6)}`;
    slugs.add(slug);

    const cover = await mirrorCover(env, item.image, slug);
    const now = nowSec();

    try {
      await run(
        env.DB,
        `INSERT INTO events
           (id, slug, title, summary, description, cover_image, community, category,
            location, city, is_online, starts_at, ends_at, timezone, registration_url,
            source, external_id, status, is_featured, tags, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'meetup', '', '', 0, ?, NULL, 'Europe/Istanbul', ?,
                 'gathin', ?, 'draft', 0, '', 0, ?, ?)`,
        [
          uuid(),
          slug,
          item.title,
          teaser(item.description),
          item.description,
          cover,
          community,
          item.pubDate,
          item.link,
          item.guid,
          now,
          now,
        ],
      );
      known.add(item.guid);
      report.created++;
      report.titles.push(item.title);
    } catch (err) {
      // A unique-index race (two syncs at once) is benign — count it as skipped.
      reportBackground(env, err, { area: "gathin/insert" });
      report.skipped++;
    }
  }

  return report;
}

/**
 * Pull both community feeds. Returns one report per community.
 * Only invalidates the events cache when something was actually created.
 */
export async function syncGathin(env: Env): Promise<SyncReport[]> {
  const reports = [
    await syncOne(env, "multigroup"),
    await syncOne(env, "multiacademy"),
  ];
  if (reports.some((r) => r.created > 0)) {
    await invalidateMany(env, [NS.events, NS.home]);
  }
  return reports;
}
