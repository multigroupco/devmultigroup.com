import type { AccentKey, Community } from "./types";
import { ACCENTS } from "./types";

/** Map a content category to an accent colour key. */
export function categoryAccent(category: string): AccentKey {
  switch ((category || "").toLowerCase()) {
    case "event":
    case "meetup":
    case "conference":
      return "iris";
    case "bootcamp":
    case "workshop":
    case "series":
      return "cyan";
    case "talk":
      return "magenta";
    case "panel":
    case "summit":
      return "amber";
    case "hackathon":
      return "coral";
    case "academy":
      return "lime";
    default:
      return "violet";
  }
}

export function communityAccent(c: Community | string): AccentKey {
  return c === "multiacademy" ? "lime" : "violet";
}

export const accentHex = (k: AccentKey): string => ACCENTS[k]?.hex ?? ACCENTS.violet.hex;
export const accentSoft = (k: AccentKey): string => ACCENTS[k]?.soft ?? ACCENTS.violet.soft;

/** Resolve a stored image value: full URL / absolute path passes through,
 *  bare values are treated as R2 object keys served via /media/<key>. */
export function imageSrc(value: string | null | undefined): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return `/media/${v}`;
}

/** Turkish display label for a content category. */
const CATEGORY_TR: Record<string, string> = {
  event: "Etkinlik",
  meetup: "Buluşma",
  conference: "Konferans",
  summit: "Zirve",
  workshop: "Atölye",
  bootcamp: "Bootcamp",
  talk: "Konuşma",
  panel: "Panel",
  hackathon: "Hackathon",
  series: "Seri",
  news: "Haber",
  community: "Topluluk",
  guides: "Rehber",
  recap: "Özet",
  engineering: "Mühendislik",
};
export const categoryLabel = (category: string): string =>
  CATEGORY_TR[(category || "").toLowerCase()] ?? category;

export const ytPlaylistUrl = (id: string): string =>
  `https://www.youtube.com/playlist?list=${id}`;

export const ytEmbedPlaylist = (id: string): string =>
  `https://www.youtube.com/embed/videoseries?list=${id}`;

/** Extract a YouTube playlist id from a full url, if present. */
export function ytPlaylistId(url: string): string {
  const m = (url || "").match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : "";
}
