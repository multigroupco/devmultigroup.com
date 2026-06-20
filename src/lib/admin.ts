// Config-driven admin: one resource registry drives list views, edit forms and
// generic persistence with cache invalidation. Add a column → add a field here.

import { all, first, run, uuid, nowSec, slugify } from "./db";
import { invalidate, invalidateMany, NS } from "./cache";
import { indexRow, unindexRow } from "./search";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "boolean"
  | "select"
  | "datetime"
  | "image"
  | "tags"
  | "color";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  help?: string;
  placeholder?: string;
  full?: boolean; // span both columns
}

export interface Resource {
  key: string;
  label: string;
  singular: string;
  table: string;
  icon: string;
  ns: string[]; // cache namespaces to invalidate on write
  searchable?: boolean; // index published/active rows into Vectorize for /api/search
  fields: Field[];
  listColumns: { name: string; label: string }[];
  defaultSort: string;
}

const opt = (...vals: string[]) => vals.map((v) => ({ value: v, label: v }));

// Turkey is a fixed UTC+3 (no DST) — convert datetime-local <-> epoch cleanly.
const TR_OFFSET = "+03:00";
export const toLocalInput = (sec: number | null | undefined): string =>
  sec == null ? "" : new Date((sec + 3 * 3600) * 1000).toISOString().slice(0, 16);
const fromLocalInput = (s: string): number | null => {
  if (!s) return null;
  const ms = Date.parse(`${s}:00${TR_OFFSET}`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

const COMMUNITY = opt("multigroup", "multiacademy");
const ACCENTS = opt("violet", "iris", "cyan", "lime", "amber", "coral", "magenta");
const ICONS = opt(
  "link", "instagram", "twitter", "linkedin", "youtube", "github", "globe",
  "calendar", "mail", "book-open", "play", "users", "sparkles", "external", "map-pin",
);

export const RESOURCES: Record<string, Resource> = {
  events: {
    key: "events",
    label: "Events",
    singular: "Event",
    table: "events",
    icon: "calendar",
    ns: [NS.events, NS.home],
    searchable: true,
    defaultSort: "COALESCE(starts_at, 9999999999) DESC",
    listColumns: [
      { name: "title", label: "Title" },
      { name: "community", label: "Community" },
      { name: "starts_at", label: "Date" },
      { name: "status", label: "Status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", help: "Leave blank to auto-generate from title." },
      { name: "summary", label: "Summary", type: "textarea", full: true, help: "One-line teaser shown on cards." },
      { name: "description", label: "Description", type: "markdown", full: true },
      { name: "cover_image", label: "Cover image", type: "image" },
      { name: "community", label: "Community", type: "select", options: COMMUNITY },
      { name: "category", label: "Category", type: "select", options: opt("meetup", "workshop", "bootcamp", "talk", "panel", "hackathon") },
      { name: "starts_at", label: "Starts", type: "datetime" },
      { name: "ends_at", label: "Ends", type: "datetime" },
      { name: "is_online", label: "Online event", type: "boolean" },
      { name: "location", label: "Venue", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "registration_url", label: "Registration URL (Gathin/Kommunity)", type: "text", full: true },
      { name: "source", label: "Source", type: "select", options: opt("manual", "gathin", "kommunity") },
      { name: "status", label: "Status", type: "select", options: opt("published", "draft") },
      { name: "is_featured", label: "Feature in site banner", type: "boolean" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "sort_order", label: "Sort order", type: "number" },
    ],
  },

  posts: {
    key: "posts",
    label: "Blog",
    singular: "Post",
    table: "posts",
    icon: "pen",
    ns: [NS.posts, NS.home],
    searchable: true,
    defaultSort: "COALESCE(published_at, created_at) DESC",
    listColumns: [
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "status", label: "Status" },
      { name: "published_at", label: "Published" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", help: "Leave blank to auto-generate." },
      { name: "excerpt", label: "Excerpt", type: "textarea", full: true },
      { name: "body_md", label: "Body (Markdown)", type: "markdown", full: true },
      { name: "cover_image", label: "Cover image", type: "image" },
      { name: "category", label: "Category", type: "select", options: opt("guides", "news", "recap", "engineering", "community") },
      { name: "author", label: "Author", type: "text" },
      { name: "author_avatar", label: "Author avatar", type: "image" },
      { name: "author_title", label: "Author title / role", type: "text" },
      { name: "author_url", label: "Author link (LinkedIn etc.)", type: "text" },
      { name: "reading_minutes", label: "Reading minutes", type: "number" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "status", label: "Status", type: "select", options: opt("draft", "published") },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "published_at", label: "Published at", type: "datetime" },
      { name: "seo_title", label: "SEO title", type: "text", full: true },
      { name: "seo_description", label: "SEO description", type: "textarea", full: true },
    ],
  },

  links: {
    key: "links",
    label: "Links",
    singular: "Link",
    table: "links",
    icon: "link",
    ns: [NS.links, NS.home],
    searchable: true,
    defaultSort: "sort_order ASC",
    listColumns: [
      { name: "label", label: "Label" },
      { name: "group_name", label: "Group" },
      { name: "clicks", label: "Clicks" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "label", label: "Label", type: "text", required: true },
      { name: "url", label: "URL", type: "text", required: true, full: true },
      { name: "description", label: "Description", type: "text", full: true },
      { name: "icon", label: "Icon", type: "select", options: ICONS },
      { name: "group_name", label: "Group", type: "select", options: opt("primary", "communities", "academy", "resources", "social", "links") },
      { name: "accent", label: "Accent colour", type: "color", options: ACCENTS },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },

  recordings: {
    key: "recordings",
    label: "Recordings",
    singular: "Recording",
    table: "recordings",
    icon: "play",
    ns: [NS.recordings, NS.home],
    searchable: true,
    defaultSort: "sort_order ASC",
    listColumns: [
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "video_count", label: "Videos" },
      { name: "duration_minutes", label: "Mins" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "youtube_url", label: "YouTube playlist URL", type: "text", full: true, help: "Full playlist URL (https://www.youtube.com/playlist?list=...)." },
      { name: "playlist_id", label: "Playlist ID", type: "text", help: "The list= value. Used if URL is empty." },
      { name: "cover_image", label: "Cover image", type: "image", help: "Playlist thumbnail. Paste a YouTube thumbnail URL or upload." },
      { name: "category", label: "Category", type: "select", options: opt("event", "bootcamp", "talk", "series") },
      { name: "video_count", label: "Video count", type: "number" },
      { name: "duration_minutes", label: "Total minutes", type: "number", help: "Sum of all video lengths in minutes. Shown as hours on the site." },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },

  gallery: {
    key: "gallery",
    label: "Gallery",
    singular: "Photo",
    table: "gallery_items",
    icon: "camera",
    ns: [NS.gallery, NS.home],
    defaultSort: "sort_order ASC, COALESCE(taken_at, created_at) DESC",
    listColumns: [
      { name: "title", label: "Title" },
      { name: "album", label: "Album" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "image_url", label: "Image", type: "image", required: true, full: true, help: "Upload a file or paste an image URL." },
      { name: "title", label: "Title", type: "text" },
      { name: "caption", label: "Caption", type: "text", full: true },
      { name: "album", label: "Album", type: "text", help: "Group photos by album name." },
      { name: "taken_at", label: "Taken at", type: "datetime" },
      { name: "width", label: "Width", type: "number" },
      { name: "height", label: "Height", type: "number" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },

  team: {
    key: "team",
    label: "Team",
    singular: "Member",
    table: "team_members",
    icon: "users",
    ns: [NS.team, NS.home],
    searchable: true,
    defaultSort: "sort_order ASC, name ASC",
    listColumns: [
      { name: "name", label: "Name" },
      { name: "role", label: "Title" },
      { name: "team", label: "Team" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Title (membership level)", type: "text" },
      { name: "team", label: "Active area / team", type: "text" },
      { name: "bio", label: "Bio", type: "textarea", full: true },
      { name: "avatar_url", label: "Avatar", type: "image" },
      { name: "community", label: "Community", type: "select", options: [...COMMUNITY, { value: "both", label: "both" }] },
      { name: "socials", label: "Socials (JSON)", type: "textarea", full: true, placeholder: '{"linkedin":"https://...","github":"https://...","twitter":"https://...","instagram":"https://...","website":"https://..."}' },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },

  communities: {
    key: "communities",
    label: "Communities",
    singular: "Community",
    table: "communities",
    icon: "users",
    ns: [NS.communities, NS.home],
    searchable: true,
    defaultSort: "sort_order ASC, name ASC",
    listColumns: [
      { name: "name", label: "Name" },
      { name: "ecosystem", label: "Ecosystem" },
      { name: "city", label: "City" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "ecosystem", label: "Ecosystem", type: "select", options: opt("MultiGroup UNIT", "Google", "Huawei", "Amazon", "IEEE", "Independent") },
      { name: "city", label: "City", type: "text" },
      { name: "logo_url", label: "Logo", type: "image" },
      { name: "instagram", label: "Instagram URL", type: "text" },
      { name: "url", label: "Website / link", type: "text" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },

  social: {
    key: "social",
    label: "Social posts",
    singular: "Social post",
    table: "social_posts",
    icon: "instagram",
    ns: [NS.social, NS.home],
    defaultSort: "sort_order ASC, COALESCE(posted_at, created_at) DESC",
    listColumns: [
      { name: "platform", label: "Platform" },
      { name: "account", label: "Account" },
      { name: "is_active", label: "Active" },
    ],
    fields: [
      { name: "platform", label: "Platform", type: "select", options: opt("instagram", "twitter", "linkedin", "youtube") },
      { name: "account", label: "Account", type: "select", options: COMMUNITY },
      { name: "post_url", label: "Post URL", type: "text", required: true, full: true },
      { name: "thumbnail", label: "Thumbnail", type: "image", help: "Upload a screenshot or paste an image URL." },
      { name: "caption", label: "Caption", type: "textarea", full: true },
      { name: "posted_at", label: "Posted at", type: "datetime" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },
};

// Site-wide settings (key/value), edited on its own page.
export const SETTINGS_FIELDS: Field[] = [
  { name: "site_title", label: "Site title", type: "text" },
  { name: "site_tagline", label: "Tagline", type: "text" },
  { name: "site_description", label: "Meta description", type: "textarea", full: true },
  { name: "ga_measurement_id", label: "Google Analytics 4 ID", type: "text", help: "e.g. G-XXXXXXXXXX — analytics goes live the moment this is set." },
  { name: "gsc_verification", label: "Google Search Console token", type: "text", help: "The content value of the google-site-verification meta tag." },
  { name: "banner_enabled", label: "Show event banner", type: "boolean" },
  { name: "stat_events", label: "Events stat", type: "text", help: "Shown on home/about, e.g. 100+" },
  { name: "stat_members", label: "Members stat", type: "text", help: "e.g. 15,000+" },
  { name: "stat_recordings", label: "Recordings stat", type: "text", help: "e.g. 17+" },
  { name: "stat_companies", label: "Companies stat", type: "text", help: "e.g. 25+" },
  { name: "stat_speakers", label: "Speakers stat", type: "text", help: "e.g. 200+" },
  { name: "stat_cities", label: "Cities stat", type: "text" },
];

/* ── coercion ─────────────────────────────────────────────────────────────── */
function coerce(field: Field, raw: FormDataEntryValue | null): string | number | null {
  const s = typeof raw === "string" ? raw : "";
  switch (field.type) {
    case "boolean":
      return s === "on" || s === "1" || s === "true" ? 1 : 0;
    case "number":
      return s === "" ? 0 : parseInt(s, 10) || 0;
    case "datetime":
      return fromLocalInput(s);
    default:
      return s;
  }
}

/* ── persistence ──────────────────────────────────────────────────────────── */
export const getResource = (key: string): Resource | null => RESOURCES[key] ?? null;

export async function listRows(
  env: Env,
  res: Resource,
  limit = 200,
): Promise<Record<string, unknown>[]> {
  return all<Record<string, unknown>>(
    env.DB,
    `SELECT * FROM ${res.table} ORDER BY ${res.defaultSort} LIMIT ?`,
    [limit],
  );
}

export async function getRow(
  env: Env,
  res: Resource,
  id: string,
): Promise<Record<string, unknown> | null> {
  return first<Record<string, unknown>>(env.DB, `SELECT * FROM ${res.table} WHERE id=? LIMIT 1`, [id]);
}

/** Upload a File to R2 and return its object key. */
export async function uploadImage(env: Env, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `uploads/${nowSec()}-${uuid().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return key;
}

/**
 * Insert or update a row from submitted form data. Handles file uploads for
 * image fields, slug auto-generation, then upserts and invalidates caches.
 */
export async function saveRow(
  env: Env,
  res: Resource,
  form: FormData,
): Promise<string> {
  const id = (form.get("id") as string) || uuid();

  // resolve image uploads first (field `<name>_file`)
  const values: Record<string, string | number | null> = {};
  for (const f of res.fields) {
    if (f.type === "image") {
      const file = form.get(`${f.name}_file`);
      if (file instanceof File && file.size > 0) {
        values[f.name] = await uploadImage(env, file);
        continue;
      }
    }
    values[f.name] = coerce(f, form.get(f.name));
  }

  // auto-slug
  if (res.fields.some((f) => f.name === "slug") && !values.slug) {
    const base = (values.title as string) || (values.label as string) || "item";
    values.slug = slugify(base);
  }

  const cols = res.fields.map((f) => f.name);
  const placeholders = ["id", ...cols, "updated_at"].map(() => "?").join(", ");
  const updates = [...cols, "updated_at"].map((c) => `${c}=excluded.${c}`).join(", ");
  const sql = `INSERT INTO ${res.table} (id, ${cols.join(", ")}, updated_at)
               VALUES (${placeholders})
               ON CONFLICT(id) DO UPDATE SET ${updates}`;
  const params = [id, ...cols.map((c) => values[c] ?? null), nowSec()];

  await run(env.DB, sql, params);
  await invalidateMany(env, res.ns);
  // Keep the search index in step: upsert published/active rows, drop drafts.
  // indexRow never throws and no-ops without Vectorize (e.g. local dev).
  if (res.searchable) {
    await indexRow(env, res.key, id, values);
    await invalidate(env, NS.search);
  }
  return id;
}

export async function deleteRow(env: Env, res: Resource, id: string): Promise<void> {
  await run(env.DB, `DELETE FROM ${res.table} WHERE id=?`, [id]);
  await invalidateMany(env, res.ns);
  if (res.searchable) {
    await unindexRow(env, res.key, id);
    await invalidate(env, NS.search);
  }
}

export async function saveSettings(env: Env, form: FormData): Promise<void> {
  const now = nowSec();
  for (const f of SETTINGS_FIELDS) {
    const value = String(coerce(f, form.get(f.name)) ?? "");
    await run(
      env.DB,
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [f.name, value, now],
    );
  }
  await invalidateMany(env, [NS.settings, NS.home]);
}

export async function countRows(env: Env, table: string): Promise<number> {
  const r = await first<{ n: number }>(env.DB, `SELECT COUNT(*) n FROM ${table}`);
  return r?.n ?? 0;
}
