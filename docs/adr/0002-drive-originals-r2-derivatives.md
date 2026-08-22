# 0002 — Drive is the original photo archive; R2 stores only web derivatives

- **Status:** Accepted
- **Date:** 2026-08-22
- **Context source:** `docs/grills/2026-08-22-dmg-gallery-system.md` (Q5, Q7)

## Context

~30GB of community event photography sits in Google Drive — roughly 650MB across each of
the ~46 physical events in `events`. The opening framing was "should the gallery be built
on R2?", which assumed the 30GB needed a home on the web.

The site has **no image-transformation layer**: zero `/cdn-cgi/image/` usage, no Cloudflare
Images. `src/pages/media/[...key].ts` returns the uploaded bytes verbatim with
`cache-control: immutable`, and `src/pages/admin/upload.ts` rejects anything over **8MB** —
below a raw camera JPEG (4–12MB). So shoot originals could not be uploaded through the
existing path at all, and the ones that squeezed through would make a 30-photo masonry grid
a ~150MB mobile page load.

Grilling the product first (see the source grill) collapsed the scope to **~50 curated
frames across 5 events**, at which point the 30GB was no longer the subject of the feature.

## Decision

**Google Drive remains the archive of record for photo originals. R2 (`MEDIA`) stores only
web derivatives, and originals are never uploaded to it.**

Every photo is downscaled *before* it reaches R2 — long edge 2000px, webp/jpeg ~q80,
landing around 300KB. The resize must apply EXIF orientation, or portrait shots render
sideways.

Sub-decisions:
- **Where the resize happens follows the ingest path.** Hand-upload through the admin CRUD
  → resize in the browser before POST. A scripted ingest → `sips -Z 2000` locally, which
  applies EXIF orientation for free. The current ingest path is the admin CRUD.
- **Staging directories are never `public/`.** `scripts/media-sync.sh` reads from `public/`,
  and Astro copies `public/` into `dist/` — so a photo staged there ships **twice**, once
  in R2 and once in the Worker asset bundle. Use a gitignored `media-src/` instead.
- **No Cloudflare Images** — neither the Zone transformations (`/cdn-cgi/image/`, $0.50 per
  1000 unique transforms, requires enabling Images on the zone) nor the Images product
  ($5/100k stored, a second storage system alongside `/media/<key>`). At ~50 photos neither
  earns its complexity.

## Consequences

- **Positive:** the gallery costs **~20MB of R2 ≈ $0.0003/month**; no new binding, no new
  subscription, no new storage system; the 8MB upload ceiling stops mattering; `/media/
  <key>` stays the single way every image on the site is served.
- **Negative / risks:**
  - **A "download the original" feature cannot be served from R2.** If attendees are ever
    offered originals, that is a new ingest project, not a flag.
  - **Drive becomes load-bearing infrastructure with no stated backup or retention policy.**
    This ADR does not give it one; that remains an open question.
  - Derivative quality is fixed at upload time. Re-deriving at a different size means
    re-uploading from Drive.
  - Two resize implementations may drift if a scripted ingest is added later alongside the
    browser path.
- **Reversible?** Partly. The decision is easy to reverse *going forward* (start uploading
  originals), but not *retroactively* — derivatives already in R2 cannot be un-downscaled,
  so any originals-based feature must re-ingest from Drive.
