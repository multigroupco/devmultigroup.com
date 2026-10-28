/**
 * Creed — MultiGroup's media archive (creed.devmultigroup.com) — is the source of
 * truth for event photos. Published photos are read from its public API and
 * shaped as GalleryRow, so GalleryGrid and the event pages render them unchanged.
 * Creed bumps this site's `cv:gallery` stamp when it publishes or unpublishes, so
 * the KV cache in content.ts stays fresh. Hand-uploaded gallery_items rows keep
 * working alongside (they are the pre-Creed mechanism and can be retired).
 *
 * Failures degrade to "no Creed photos", never to a broken page.
 */
import type { GalleryRow } from "./types";

interface CreedPhoto {
  id: string;
  width: number | null;
  height: number | null;
  taken_at: number | null;
  published_at: number;
  album: string;
  album_title: string;
  event_slug: string | null;
  src: string;
  thumb: string;
}

const DEFAULT_CREED_URL = "https://creed.devmultigroup.com";

export async function creedPhotos(
  env: Env,
  opts: { event?: string; limit?: number } = {},
): Promise<GalleryRow[]> {
  const base = env.CREED_URL ?? DEFAULT_CREED_URL;
  const qs = new URLSearchParams({ limit: String(opts.limit ?? 300) });
  if (opts.event) qs.set("event", opts.event);
  try {
    const r = await fetch(`${base}/api/public/photos?${qs}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const { photos } = (await r.json()) as { photos: CreedPhoto[] };
    return photos.map((p) => ({
      id: `creed:${p.id}`,
      title: "",
      caption: "",
      image_key: "",
      image_url: p.src,
      // Rows bind to events by slug (ADR 0004); Creed albums without an event
      // keep their own slug so they still group, but never match an event page.
      album: p.event_slug ?? `creed-${p.album}`,
      width: p.width ?? 0,
      height: p.height ?? 0,
      taken_at: p.taken_at,
      sort_order: 0,
      is_active: 1,
      created_at: p.published_at,
      updated_at: p.published_at,
    }));
  } catch {
    return [];
  }
}
