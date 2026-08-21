// Row shapes mirroring migrations/0001_init.sql. Booleans are 0/1 in D1.

export type Community = "multigroup" | "multiacademy";
export type AccentKey =
  | "violet"
  | "iris"
  | "cyan"
  | "lime"
  | "amber"
  | "coral"
  | "magenta";

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  cover_image: string;
  community: Community;
  category: string;
  location: string;
  city: string;
  is_online: number;
  starts_at: number | null;
  ends_at: number | null;
  timezone: string;
  registration_url: string;
  source: string;
  /** Stable upstream id (Gathin RSS <guid>). Empty for manually-created rows. */
  external_id: string;
  status: string;
  is_featured: number;
  tags: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  cover_image: string;
  author: string;
  author_avatar: string;
  author_url: string;
  author_title: string;
  tags: string;
  category: string;
  reading_minutes: number;
  status: string;
  featured: number;
  published_at: number | null;
  seo_title: string;
  seo_description: string;
  created_at: number;
  updated_at: number;
}

export interface LinkRow {
  id: string;
  label: string;
  url: string;
  description: string;
  icon: string;
  group_name: string;
  accent: AccentKey;
  sort_order: number;
  is_active: number;
  clicks: number;
  created_at: number;
  updated_at: number;
}

/** MultiAcademy linktree row (/academy-links). Same shape as `LinkRow` so it
 *  renders through the same LinkButton and counts clicks via /go/<id>. */
export type AcademyLinkRow = LinkRow;

/** One photo in the marquee flowing behind the homepage hero. */
export interface HeroSlideRow {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/** Curated open-source content repo shown on /kaynakca. */
export interface ResourceRow {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  group_name: string; // kaynakca | bootcamp | diger
  lang: string;
  sort_order: number;
  is_active: number;
  is_soon: number;
  created_at: number;
  updated_at: number;
}

export interface RecordingRow {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  playlist_id: string;
  cover_image: string;
  category: string;
  video_count: number;
  duration_minutes: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/** One icon + title + line block on a podcast page ("neler bekliyor" / "kimler için"). */
export interface PodcastFeature {
  /** An Icon.astro name — the monochrome set, never an emoji. */
  icon: string;
  title: string;
  text: string;
}

/**
 * A podcast SHOW (a series), not an episode — episodes live on the platforms.
 * See migrations/0010 for why the row stops at the show.
 */
export interface PodcastRow {
  id: string;
  slug: string;
  title: string;
  show_name: string;
  kicker: string;
  lede: string;
  body_md: string;
  cover_image: string;
  host: string;
  host_slug: string;
  schedule: string;
  episode_length: string;
  spotify_url: string;
  apple_url: string;
  youtube_url: string;
  subscribe_url: string;
  highlights_json: string; // json PodcastFeature[]
  audience_json: string; // json PodcastFeature[]
  first_episode_at: number | null;
  is_soon: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface GalleryRow {
  id: string;
  title: string;
  caption: string;
  image_key: string;
  image_url: string;
  album: string;
  width: number;
  height: number;
  taken_at: number | null;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
  role: string;
  team: string;
  bio: string;
  /** Long-form markdown shown on /team/<slug>; `bio` stays the card one-liner. */
  long_bio: string;
  /** Comma-separated focus areas, e.g. "Astro, Cloudflare, DX". */
  focus: string;
  avatar_url: string;
  community: string;
  socials: string; // json
  joined_at: number | null;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/** One animated counter on a partner page. */
export interface PartnerMetric {
  value: string;
  label: string;
}

/** One linked tile in a partner's media grid. */
export interface PartnerGalleryItem {
  img: string;
  title?: string;
  caption?: string;
  href?: string;
}

/**
 * An ACTIVE collaboration (/partnerships). Distinct from `CompanyRow` (an
 * employer a speaker came from) and `CommunityRow` (a partner chapter) — see
 * migrations/0009 for the three-way split.
 */
export interface PartnerRow {
  id: string;
  slug: string;
  name: string;
  kicker: string;
  lede: string;
  body_md: string;
  logo_url: string;
  hero_image: string;
  website: string;
  category: string;
  year_from: number | null;
  metrics_json: string; // json PartnerMetric[]
  gallery_json: string; // json PartnerGalleryItem[]
  featured: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface SocialRow {
  id: string;
  platform: "instagram" | "twitter" | "linkedin" | "youtube";
  account: Community;
  post_url: string;
  embed_html: string;
  thumbnail: string;
  caption: string;
  posted_at: number | null;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  ecosystem: string; // Google | Huawei | Amazon | IEEE | Independent
  city: string;
  logo_url: string;
  instagram: string;
  url: string;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  sector: string;
  logo_url: string;
  website: string;
  description: string;
  featured: number;
  /** Shown in the homepage logo marquee (CompanyStrip). */
  in_strip: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/** One archived talk on a speaker's record. `slug` links to a seeded event
 *  when matched (null for pre-2022 events with no seeded page). */
export interface SpeakerTalk {
  event: string;
  date: string | null; // yyyy-mm-dd
  slug: string | null;
}

export interface SpeakerRow {
  id: string;
  name: string;
  slug: string;
  title: string;
  company: string;
  company_id: string | null;
  bio: string;
  avatar_url: string;
  socials: string; // json
  tags: string; // csv
  talks: string; // json SpeakerTalk[]
  talk_count: number;
  first_talk_at: number | null;
  last_talk_at: number | null;
  featured: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/** A speaker row joined with its event_speakers link fields. */
export interface EventSpeaker extends SpeakerRow {
  role: string;
  talk_title: string;
}

export interface SpeakerSocials {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
}

export type Settings = Record<string, string>;

export interface TeamSocials {
  twitter?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  website?: string;
}

/** Monochrome accent palette (kept in sync with global.css). White is the only
 *  accent; the rest are soft grays so categories read as tone, never colour. */
export const ACCENTS: Record<AccentKey, { hex: string; soft: string }> = {
  violet: { hex: "#ededef", soft: "rgba(255,255,255,0.10)" },
  iris: { hex: "#cdcdd2", soft: "rgba(255,255,255,0.08)" },
  cyan: { hex: "#d3d3d7", soft: "rgba(255,255,255,0.08)" },
  lime: { hex: "#c7c7cc", soft: "rgba(255,255,255,0.08)" },
  amber: { hex: "#d8d8dc", soft: "rgba(255,255,255,0.08)" },
  coral: { hex: "#cccccf", soft: "rgba(255,255,255,0.08)" },
  magenta: { hex: "#d3d3d7", soft: "rgba(255,255,255,0.08)" },
};
