// Public, cached read layer over D1. Pages call these; never raw SQL.

import { cached, NS } from "./cache";
import { all, first } from "./db";
import type {
  EventRow,
  GalleryRow,
  LinkRow,
  PostRow,
  RecordingRow,
  Settings,
  SocialRow,
  TeamRow,
  CommunityRow,
  CompanyRow,
  SpeakerRow,
  EventSpeaker,
  Community,
} from "./types";

const GRACE = 6 * 3600; // events stay "upcoming" until 6h after start
const cutoff = () => Math.floor(Date.now() / 1000) - GRACE;

/* ── settings ─────────────────────────────────────────────────────────────── */
export async function getSettings(env: Env): Promise<Settings> {
  return cached(env, NS.settings, "all", async () => {
    const rows = await all<{ key: string; value: string }>(
      env.DB,
      "SELECT key, value FROM settings",
    );
    const out: Settings = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  });
}

export async function getSetting(
  env: Env,
  key: string,
  fallback = "",
): Promise<string> {
  const s = await getSettings(env);
  return s[key] ?? fallback;
}

/* ── events ───────────────────────────────────────────────────────────────── */
export interface EventQuery {
  community?: Community | "all";
  when?: "upcoming" | "past" | "all";
  limit?: number;
  offset?: number;
  year?: number;
}

// [yearStart, yearEnd) epoch seconds for a calendar year in Turkey (UTC+3, no DST)
const yearRange = (year: number): [number, number] => [
  Math.floor(Date.UTC(year, 0, 1) / 1000) - 3 * 3600,
  Math.floor(Date.UTC(year + 1, 0, 1) / 1000) - 3 * 3600,
];

export async function listEvents(
  env: Env,
  q: EventQuery = {},
): Promise<EventRow[]> {
  const { community = "all", when = "all", limit = 50, offset = 0, year } = q;
  const key = `list:${community}:${when}:${limit}:${offset}:${year ?? 0}`;
  return cached(env, NS.events, key, async () => {
    const where: string[] = ["status = 'published'"];
    const params: unknown[] = [];
    if (community !== "all") {
      where.push("community = ?");
      params.push(community);
    }
    let order = "ORDER BY COALESCE(starts_at, 9999999999) DESC";
    if (when === "upcoming") {
      where.push("(starts_at IS NULL OR starts_at >= ?)");
      params.push(cutoff());
      // nearest upcoming first
      order = "ORDER BY COALESCE(starts_at, 9999999999) ASC";
    } else if (when === "past") {
      where.push("starts_at < ?");
      params.push(cutoff());
      // most recent event first (by start date) → oldest last
      order = "ORDER BY COALESCE(starts_at, 0) DESC";
    }
    if (year) {
      const [ys, ye] = yearRange(year);
      where.push("starts_at >= ? AND starts_at < ?");
      params.push(ys, ye);
    }
    params.push(limit, offset);
    return all<EventRow>(
      env.DB,
      `SELECT * FROM events WHERE ${where.join(" AND ")} ${order} LIMIT ? OFFSET ?`,
      params,
    );
  });
}

/** Count of published events for a community/when filter (cached) — for pagination. */
export async function countEvents(
  env: Env,
  q: { community?: string; when?: "all" | "upcoming" | "past"; year?: number } = {},
): Promise<number> {
  const { community = "all", when = "all", year } = q;
  return cached(env, NS.events, `count:${community}:${when}:${year ?? 0}`, async () => {
    const where: string[] = ["status = 'published'"];
    const params: unknown[] = [];
    if (community !== "all") {
      where.push("community = ?");
      params.push(community);
    }
    if (when === "upcoming") {
      where.push("(starts_at IS NULL OR starts_at >= ?)");
      params.push(cutoff());
    } else if (when === "past") {
      where.push("starts_at < ?");
      params.push(cutoff());
    }
    if (year) {
      const [ys, ye] = yearRange(year);
      where.push("starts_at >= ? AND starts_at < ?");
      params.push(ys, ye);
    }
    const r = await first<{ n: number }>(
      env.DB,
      `SELECT COUNT(*) n FROM events WHERE ${where.join(" AND ")}`,
      params,
    );
    return r?.n ?? 0;
  });
}

/** Distinct years that have past events (cached) — for the year filter. */
export async function eventYears(env: Env, community = "all"): Promise<number[]> {
  return cached(env, NS.events, `years:${community}`, async () => {
    const where: string[] = ["status = 'published'", "starts_at IS NOT NULL", "starts_at < ?"];
    const params: unknown[] = [cutoff()];
    if (community !== "all") {
      where.push("community = ?");
      params.push(community);
    }
    const rows = await all<{ y: string }>(
      env.DB,
      `SELECT DISTINCT strftime('%Y', starts_at, 'unixepoch', '+3 hours') y FROM events WHERE ${where.join(" AND ")} ORDER BY y DESC`,
      params,
    );
    return rows.map((r) => parseInt(r.y, 10)).filter(Boolean);
  });
}

export async function getEvent(env: Env, slug: string): Promise<EventRow | null> {
  return cached(env, NS.events, `get:${slug}`, () =>
    first<EventRow>(env.DB, "SELECT * FROM events WHERE slug = ? LIMIT 1", [slug]),
  );
}

/** The event for the site-wide banner: featured + soonest upcoming. */
export async function featuredEvent(env: Env): Promise<EventRow | null> {
  return cached(env, NS.events, "featured", async () => {
    const featured = await first<EventRow>(
      env.DB,
      `SELECT * FROM events
       WHERE status='published' AND is_featured=1
         AND (starts_at IS NULL OR starts_at >= ?)
       ORDER BY COALESCE(starts_at, 9999999999) ASC LIMIT 1`,
      [cutoff()],
    );
    if (featured) return featured;
    return first<EventRow>(
      env.DB,
      `SELECT * FROM events
       WHERE status='published' AND (starts_at IS NULL OR starts_at >= ?)
       ORDER BY COALESCE(starts_at, 9999999999) ASC LIMIT 1`,
      [cutoff()],
    );
  });
}

/* ── posts ────────────────────────────────────────────────────────────────── */
export interface PostQuery {
  limit?: number;
  offset?: number;
  tag?: string;
  category?: string;
  featured?: boolean;
}

export async function listPosts(env: Env, q: PostQuery = {}): Promise<PostRow[]> {
  const { limit = 24, offset = 0, tag, category, featured } = q;
  const key = `list:${limit}:${offset}:${tag ?? ""}:${category ?? ""}:${featured ? 1 : 0}`;
  return cached(env, NS.posts, key, async () => {
    const where = ["status = 'published'"];
    const params: unknown[] = [];
    if (tag) {
      where.push("(',' || REPLACE(tags,', ',',') || ',') LIKE ?");
      params.push(`%,${tag},%`);
    }
    if (category) {
      where.push("category = ?");
      params.push(category);
    }
    if (featured) where.push("featured = 1");
    params.push(limit, offset);
    return all<PostRow>(
      env.DB,
      `SELECT * FROM posts WHERE ${where.join(" AND ")}
       ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?`,
      params,
    );
  });
}

export async function getPost(env: Env, slug: string): Promise<PostRow | null> {
  return cached(env, NS.posts, `get:${slug}`, () =>
    first<PostRow>(
      env.DB,
      "SELECT * FROM posts WHERE slug = ? AND status='published' LIMIT 1",
      [slug],
    ),
  );
}

/* ── links ────────────────────────────────────────────────────────────────── */
export async function listLinks(env: Env): Promise<LinkRow[]> {
  return cached(env, NS.links, "active", () =>
    all<LinkRow>(
      env.DB,
      `SELECT * FROM links WHERE is_active=1 ORDER BY sort_order ASC, created_at ASC`,
    ),
  );
}

/* ── recordings ───────────────────────────────────────────────────────────── */
export async function listRecordings(
  env: Env,
  category?: string,
): Promise<RecordingRow[]> {
  return cached(env, NS.recordings, `c:${category ?? "all"}`, () => {
    if (category) {
      return all<RecordingRow>(
        env.DB,
        `SELECT * FROM recordings WHERE is_active=1 AND category=? ORDER BY sort_order ASC`,
        [category],
      );
    }
    return all<RecordingRow>(
      env.DB,
      `SELECT * FROM recordings WHERE is_active=1 ORDER BY sort_order ASC`,
    );
  });
}

/** Recordings linked to a given event (via event_recordings). */
export async function getEventRecordings(env: Env, eventId: string): Promise<RecordingRow[]> {
  return cached(env, NS.recordings, `ev:${eventId}`, () =>
    all<RecordingRow>(
      env.DB,
      `SELECT r.* FROM recordings r
       JOIN event_recordings er ON er.recording_id = r.id
       WHERE er.event_id = ? AND r.is_active = 1
       ORDER BY r.sort_order ASC`,
      [eventId],
    ),
  );
}

/* ── gallery ──────────────────────────────────────────────────────────────── */
export async function listGallery(
  env: Env,
  opts: { album?: string; limit?: number } = {},
): Promise<GalleryRow[]> {
  const { album, limit = 60 } = opts;
  return cached(env, NS.gallery, `a:${album ?? "all"}:${limit}`, () => {
    if (album) {
      return all<GalleryRow>(
        env.DB,
        `SELECT * FROM gallery_items WHERE is_active=1 AND album=?
         ORDER BY sort_order ASC, COALESCE(taken_at, created_at) DESC LIMIT ?`,
        [album, limit],
      );
    }
    return all<GalleryRow>(
      env.DB,
      `SELECT * FROM gallery_items WHERE is_active=1
       ORDER BY sort_order ASC, COALESCE(taken_at, created_at) DESC LIMIT ?`,
      [limit],
    );
  });
}

/* ── team ─────────────────────────────────────────────────────────────────── */
export async function listTeam(
  env: Env,
  community?: Community,
): Promise<TeamRow[]> {
  return cached(env, NS.team, `c:${community ?? "all"}`, () => {
    if (community) {
      return all<TeamRow>(
        env.DB,
        `SELECT * FROM team_members WHERE is_active=1 AND (community=? OR community='both')
         ORDER BY sort_order ASC, name ASC`,
        [community],
      );
    }
    return all<TeamRow>(
      env.DB,
      `SELECT * FROM team_members WHERE is_active=1 ORDER BY sort_order ASC, name ASC`,
    );
  });
}

/* ── communities (partners) ──────────────────────────────────────────────── */
export async function listCommunities(env: Env): Promise<CommunityRow[]> {
  return cached(env, NS.communities, "c:all", () =>
    all<CommunityRow>(
      env.DB,
      `SELECT * FROM communities WHERE is_active=1 ORDER BY sort_order ASC, name ASC`,
    ),
  );
}

/* ── companies (employers represented at our events) ──────────────────────── */
export async function listCompanies(
  env: Env,
  opts: { sector?: string; limit?: number } = {},
): Promise<CompanyRow[]> {
  const { sector, limit = 500 } = opts;
  return cached(env, NS.companies, `list:${sector ?? "all"}:${limit}`, () => {
    if (sector) {
      return all<CompanyRow>(
        env.DB,
        `SELECT * FROM companies WHERE is_active=1 AND sector=?
         ORDER BY featured DESC, sort_order ASC, name ASC LIMIT ?`,
        [sector, limit],
      );
    }
    return all<CompanyRow>(
      env.DB,
      `SELECT * FROM companies WHERE is_active=1
       ORDER BY featured DESC, sort_order ASC, name ASC LIMIT ?`,
      [limit],
    );
  });
}

export async function getCompany(env: Env, slug: string): Promise<CompanyRow | null> {
  return cached(env, NS.companies, `get:${slug}`, () =>
    first<CompanyRow>(env.DB, "SELECT * FROM companies WHERE slug=? LIMIT 1", [slug]),
  );
}

/* ── speakers ─────────────────────────────────────────────────────────────── */
export async function listSpeakers(
  env: Env,
  opts: { limit?: number; featured?: boolean } = {},
): Promise<SpeakerRow[]> {
  const { limit = 500, featured } = opts;
  return cached(env, NS.speakers, `list:${limit}:${featured ? 1 : 0}`, () => {
    const where = ["is_active=1"];
    if (featured) where.push("featured=1");
    // most-prolific speakers first, then most recent, then name
    return all<SpeakerRow>(
      env.DB,
      `SELECT * FROM speakers WHERE ${where.join(" AND ")}
       ORDER BY featured DESC, talk_count DESC, COALESCE(last_talk_at,0) DESC, name ASC
       LIMIT ?`,
      [limit],
    );
  });
}

export async function getSpeaker(env: Env, slug: string): Promise<SpeakerRow | null> {
  return cached(env, NS.speakers, `get:${slug}`, () =>
    first<SpeakerRow>(env.DB, "SELECT * FROM speakers WHERE slug=? LIMIT 1", [slug]),
  );
}

/** Speakers for one event (via event_speakers) — for the event detail page. */
export async function getEventSpeakers(env: Env, eventId: string): Promise<EventSpeaker[]> {
  return cached(env, NS.speakers, `ev:${eventId}`, () =>
    all<EventSpeaker>(
      env.DB,
      `SELECT s.*, es.role AS role, es.talk_title AS talk_title
       FROM event_speakers es JOIN speakers s ON s.id = es.speaker_id
       WHERE es.event_id = ? AND s.is_active = 1
       ORDER BY es.sort_order ASC, s.talk_count DESC, s.name ASC`,
      [eventId],
    ),
  );
}

/** Speakers who have worked at a given company — for the (future) company page. */
export async function getCompanySpeakers(env: Env, companyId: string): Promise<SpeakerRow[]> {
  return cached(env, NS.speakers, `co:${companyId}`, () =>
    all<SpeakerRow>(
      env.DB,
      `SELECT * FROM speakers WHERE is_active=1 AND company_id=?
       ORDER BY talk_count DESC, name ASC`,
      [companyId],
    ),
  );
}

/** company_id → epoch secs of its earliest talk (first time on our stage). */
export async function companyFirstSeen(env: Env): Promise<Record<string, number>> {
  return cached(env, NS.speakers, "co-first", async () => {
    const rows = await all<{ company_id: string; m: number }>(
      env.DB,
      `SELECT company_id, MIN(first_talk_at) m FROM speakers
       WHERE company_id IS NOT NULL AND company_id<>'' AND first_talk_at IS NOT NULL
       GROUP BY company_id`,
    );
    const o: Record<string, number> = {};
    for (const r of rows) o[r.company_id] = r.m;
    return o;
  });
}

/** company_id → number of speakers, for company cards. */
export async function companySpeakerCounts(env: Env): Promise<Record<string, number>> {
  return cached(env, NS.speakers, "co-counts", async () => {
    const rows = await all<{ company_id: string; n: number }>(
      env.DB,
      `SELECT company_id, COUNT(*) n FROM speakers
       WHERE is_active=1 AND company_id IS NOT NULL AND company_id<>''
       GROUP BY company_id`,
    );
    const m: Record<string, number> = {};
    for (const r of rows) m[r.company_id] = r.n;
    return m;
  });
}

/* ── social ───────────────────────────────────────────────────────────────── */
export async function listSocial(
  env: Env,
  opts: { account?: Community; platform?: string; limit?: number } = {},
): Promise<SocialRow[]> {
  const { account, platform, limit = 12 } = opts;
  return cached(env, NS.social, `${account ?? "all"}:${platform ?? "all"}:${limit}`, () => {
    const where = ["is_active=1"];
    const params: unknown[] = [];
    if (account) {
      where.push("account=?");
      params.push(account);
    }
    if (platform) {
      where.push("platform=?");
      params.push(platform);
    }
    params.push(limit);
    return all<SocialRow>(
      env.DB,
      `SELECT * FROM social_posts WHERE ${where.join(" AND ")}
       ORDER BY sort_order ASC, COALESCE(posted_at, created_at) DESC LIMIT ?`,
      params,
    );
  });
}

/* ── aggregate stats for the landing page ─────────────────────────────────── */
export interface SiteStats {
  events: number;
  pastEvents: number;
  posts: number;
  recordings: number;
  companies: number;
  speakers: number;
}
export async function getStats(env: Env): Promise<SiteStats> {
  return cached(env, NS.home, "stats", async () => {
    const c = async (sql: string, p: unknown[] = []) =>
      (await first<{ n: number }>(env.DB, sql, p))?.n ?? 0;
    return {
      events: await c("SELECT COUNT(*) n FROM events WHERE status='published'"),
      pastEvents: await c(
        "SELECT COUNT(*) n FROM events WHERE status='published' AND starts_at < ?",
        [cutoff()],
      ),
      posts: await c("SELECT COUNT(*) n FROM posts WHERE status='published'"),
      recordings: await c("SELECT COUNT(*) n FROM recordings WHERE is_active=1"),
      companies: await c("SELECT COUNT(*) n FROM companies WHERE is_active=1"),
      speakers: await c("SELECT COUNT(*) n FROM speakers WHERE is_active=1"),
    };
  });
}
