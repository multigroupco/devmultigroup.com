// Generates scripts/events.sql from scripts/gathin-events.json (the 15 Gathin
// community events). Run: node scripts/gen-events.mjs > scripts/events.sql
import { readFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")).result;
const data = [
  ...read("./gathin-events.json").map((e) => ({ ...e, community: "multigroup" })),
  ...read("./gathin-academy-events.json").map((e) => ({ ...e, community: "multiacademy" })),
];

const nowSec = Math.floor(Date.now() / 1000);

const TR = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u", â: "a", î: "i", û: "u" };
function slugify(s) {
  return (s || "")
    .trim()
    .replace(/[çğıİöşüÇĞÖŞÜâîû]/g, (c) => TR[c] || c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "event";
}
function strip(s) {
  return (s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\u{1F000}-\u{1FAFF}☀-➿←-⇿⬀-⯿️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
function summarize(s) {
  const t = strip(s);
  if (t.length <= 160) return t;
  return t.slice(0, 160).replace(/\s+\S*$/, "") + "…";
}
const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");

function category(title, community) {
  const t = title.toLowerCase();
  if (t.includes("summit")) return "summit";
  if (t.includes("conference")) return "conference";
  if (t.includes("meetup")) return "meetup";
  if (t.includes("gathering") || t.includes("connect") || t.includes("networking") || t.includes("skyward")) return "meetup";
  if (t.includes("bootcamp")) return "bootcamp";
  if (t.includes("program") || t.includes("certification") || t.includes("course")) return "bootcamp";
  if (t.includes("deep dive") || t.includes("patterns") || t.includes("architecture") || t.includes("summarizer") || t.includes("build a")) return "workshop";
  return community === "multiacademy" ? "bootcamp" : "meetup";
}

// feature the soonest still-upcoming event (drives the site banner)
let featuredId = null;
let featuredStart = Infinity;
for (const e of data) {
  const s = parseInt(e.eventStartDateTime, 10);
  if (s >= nowSec && s < featuredStart) {
    featuredStart = s;
    featuredId = e.eventID;
  }
}

const rows = data.map((e, i) => {
  const id = "gathin-" + e.eventID;
  const slug = slugify(e.title);
  const isOnline = e.isOnline === "1" ? 1 : 0;
  const city = e.city ? e.city : isOnline ? "" : "İstanbul";
  const start = parseInt(e.eventStartDateTime, 10) || "NULL";
  const end = parseInt(e.eventEndDateTime, 10) || "NULL";
  const reg = "https://gathin.com/events/" + e.url;
  const feat = e.eventID === featuredId ? 1 : 0;
  return `  ('${esc(id)}', '${esc(slug)}', '${esc(e.title)}', '${esc(summarize(e.description))}', '${esc(e.description)}', '${esc(e.cover)}', '${e.community}', '${category(e.title, e.community)}', '${esc(e.locationAddress)}', '${esc(city)}', ${isOnline}, ${start}, ${end}, '${esc(reg)}', 'gathin', 'published', ${feat}, '', ${i})`;
});

const out = [
  "-- GENERATED from scripts/gathin-events.json (Gathin community events). Do not edit by hand.",
  "-- Regenerate: node scripts/gen-events.mjs > scripts/events.sql",
  "DELETE FROM events;",
  "INSERT OR REPLACE INTO events (id, slug, title, summary, description, cover_image, community, category, location, city, is_online, starts_at, ends_at, registration_url, source, status, is_featured, tags, sort_order) VALUES",
  rows.join(",\n") + ";",
  "",
].join("\n");

process.stdout.write(out);
