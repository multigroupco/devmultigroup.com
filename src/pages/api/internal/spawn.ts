import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { nowSec, slugify, uuid } from "@/lib/db";
import { invalidateMany } from "@/lib/cache";
import { RESOURCES } from "@/lib/admin";
import { indexRow } from "@/lib/search";

// Spawn (the team's internal tool) publishes a few things to the site, always on
// a person's click, never on its own:
//   events.list / events.create / events.link   a program becomes a draft event
//   speakers.publish                            a confirmed speaker gets a page
//   team.list / team.apply                      the /team list follows Spawn
//   communities.list / communities.upsert       active partner communities
//
// POST {op, ...} over the SITE service binding, header x-internal-token =
// SPAWN_TOKEN. The site stays the owner of its schema; Spawn never touches D1.
type Row = Record<string, string | number | null>;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const token = request.headers.get("x-internal-token");
  if (!env.SPAWN_TOKEN || !token || token !== env.SPAWN_TOKEN) return json({ error: "unauthorized" }, 401);
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  const db = env.DB;
  const all = async <T,>(sql: string, args: unknown[] = []) => ((await db.prepare(sql).bind(...args).all<T>()).results ?? []) as T[];
  const one = async <T,>(sql: string, args: unknown[] = []) => (await db.prepare(sql).bind(...args).first<T>()) ?? null;
  const reindex = async (key: string, id: string, table: string) => {
    const row = await one<Row>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (row) await indexRow(env, key, id, row);
  };

  switch (b.op) {
    case "events.list": {
      const from = Number(b.from) || 0, to = Number(b.to) || 9999999999;
      return json({ events: await all("SELECT id, slug, title, starts_at, status, external_id, location FROM events WHERE (starts_at BETWEEN ? AND ?) OR external_id = ? ORDER BY starts_at", [from, to, `spawn:${b.programId ?? ""}`]) });
    }
    case "events.create": {
      const ext = `spawn:${b.programId}`;
      const hit = await one<Row>("SELECT id, slug, title, status FROM events WHERE external_id = ?", [ext]);
      if (hit) return json({ event: hit });
      const id = uuid();
      let slug = slugify(String(b.title || "etkinlik"));
      if (await one("SELECT 1 FROM events WHERE slug = ?", [slug])) slug = `${slug}-${id.slice(0, 6)}`;
      await db.prepare(
        `INSERT INTO events (id, slug, title, community, category, location, city, starts_at, ends_at, status, source, external_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'manual', ?, ?)`,
      ).bind(id, slug, String(b.title).slice(0, 200), b.community === "multiacademy" ? "multiacademy" : "multigroup", b.category || "meetup",
        String(b.location ?? ""), String(b.city ?? ""), b.starts_at ?? null, b.ends_at ?? null, ext, nowSec()).run();
      await invalidateMany(env, RESOURCES.events.ns);
      return json({ event: await one("SELECT id, slug, title, status FROM events WHERE id = ?", [id]) });
    }
    case "events.link": {
      const ev = await one<Row>("SELECT id, slug, title, status, external_id FROM events WHERE id = ?", [b.eventId]);
      if (!ev) return json({ error: "Etkinlik bulunamadı." }, 404);
      if (ev.external_id && ev.external_id !== `spawn:${b.programId}`) return json({ error: "Bu etkinlik başka bir programa bağlı." }, 409);
      await db.prepare("UPDATE events SET external_id = ?, updated_at = ? WHERE id = ?").bind(`spawn:${b.programId}`, nowSec(), ev.id).run();
      await invalidateMany(env, RESOURCES.events.ns);
      return json({ event: ev });
    }
    case "speakers.publish": {
      const name = String(b.name ?? "").trim();
      if (!name) return json({ error: "İsim gerekli." }, 400);
      const slug = slugify(name);
      let sp = await one<Row>("SELECT id, slug FROM speakers WHERE id = ? OR slug = ?", [b.speakerId ?? "", slug]);
      if (!sp) {
        const id = uuid();
        await db.prepare("INSERT INTO speakers (id, name, slug, title, company, is_active, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
          .bind(id, name, slug, String(b.title ?? ""), String(b.company ?? ""), nowSec()).run();
        sp = { id, slug };
      } else {
        await db.prepare("UPDATE speakers SET title = COALESCE(NULLIF(title, ''), ?), company = COALESCE(NULLIF(company, ''), ?), updated_at = ? WHERE id = ?")
          .bind(String(b.title ?? ""), String(b.company ?? ""), nowSec(), sp.id).run();
      }
      if (b.eventId) {
        await db.prepare("INSERT OR IGNORE INTO event_speakers (event_id, speaker_id, talk_title) VALUES (?, ?, ?)").bind(b.eventId, sp.id, String(b.talk ?? "")).run();
        await db.prepare(
          `UPDATE speakers SET talk_count = (SELECT COUNT(*) FROM event_speakers WHERE speaker_id = ?1),
             first_talk_at = (SELECT MIN(e.starts_at) FROM event_speakers x JOIN events e ON e.id = x.event_id WHERE x.speaker_id = ?1),
             last_talk_at = (SELECT MAX(e.starts_at) FROM event_speakers x JOIN events e ON e.id = x.event_id WHERE x.speaker_id = ?1)
           WHERE id = ?1`,
        ).bind(sp.id).run();
      }
      await invalidateMany(env, [...RESOURCES.speakers.ns, ...RESOURCES.events.ns]);
      await reindex("speakers", String(sp.id), "speakers");
      return json({ speaker: sp });
    }
    case "team.list":
      return json({ team: await all("SELECT id, name, slug, role, team, is_active FROM team_members ORDER BY sort_order, name") });
    case "team.apply": {
      const out: Row[] = [];
      for (const r of (b.rows ?? []) as Row[]) {
        if (r.id) {
          await db.prepare("UPDATE team_members SET name = ?, role = ?, team = ?, is_active = ?, updated_at = ? WHERE id = ?")
            .bind(r.name, r.role ?? "", r.team ?? "", r.is_active ? 1 : 0, nowSec(), r.id).run();
          out.push({ id: r.id });
        } else {
          const id = uuid();
          await db.prepare("INSERT INTO team_members (id, name, slug, role, team, is_active, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, 99, ?)")
            .bind(id, r.name, slugify(String(r.name)), r.role ?? "", r.team ?? "", r.is_active ? 1 : 0, nowSec()).run();
          out.push({ id });
        }
        await reindex("team", String(out.at(-1)!.id), "team_members");
      }
      await invalidateMany(env, RESOURCES.team.ns);
      return json({ rows: out });
    }
    case "communities.list":
      return json({ communities: await all("SELECT id, name, slug, ecosystem, city, instagram, url, is_active FROM communities ORDER BY sort_order, name") });
    case "communities.upsert": {
      let created = 0, updated = 0;
      for (const r of (b.rows ?? []) as Row[]) {
        const name = String(r.name ?? "").trim();
        if (!name) continue;
        const slug = slugify(name);
        const hit = await one<Row>("SELECT id FROM communities WHERE slug = ? OR lower(name) = lower(?)", [slug, name]);
        if (hit) {
          await db.prepare(
            `UPDATE communities SET ecosystem = COALESCE(NULLIF(?, ''), ecosystem), city = COALESCE(NULLIF(?, ''), city),
               instagram = COALESCE(NULLIF(?, ''), instagram), url = COALESCE(NULLIF(?, ''), url), is_active = 1, updated_at = ? WHERE id = ?`,
          ).bind(r.ecosystem ?? "", r.city ?? "", r.instagram ?? "", r.url ?? "", nowSec(), hit.id).run();
          updated++;
          await reindex("communities", String(hit.id), "communities");
        } else {
          const id = uuid();
          await db.prepare("INSERT INTO communities (id, name, slug, ecosystem, city, instagram, url, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)")
            .bind(id, name, slug, r.ecosystem || "Independent", r.city ?? "", r.instagram ?? "", r.url ?? "", nowSec()).run();
          created++;
          await reindex("communities", id, "communities");
        }
      }
      await invalidateMany(env, RESOURCES.communities.ns);
      return json({ created, updated });
    }
  }
  return json({ error: "unknown op" }, 400);
};

export const prerender = false;
