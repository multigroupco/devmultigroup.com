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
  role: string;
  team: string;
  bio: string;
  avatar_url: string;
  community: string;
  socials: string; // json
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
