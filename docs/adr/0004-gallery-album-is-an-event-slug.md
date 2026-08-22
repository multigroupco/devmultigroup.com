# 0004 — Gallery photos bind to events by slug convention, not a foreign key

- **Status:** Accepted
- **Date:** 2026-08-22
- **Context source:** `docs/grills/2026-08-22-dmg-gallery-system.md` (Q6)

## Context

`gallery_items.album` (`migrations/0001_init.sql:97`) is a free-text `TEXT` column with no
foreign key, and `events` has no link to photos at all. Six years of events exist as rows;
the photo table has never held one.

The gallery needs entry from **two** directions: a section on `/events/<slug>`, and its own
`/gallery` route. Both reduce to "the photos belonging to this event, ordered" — which the
existing index `idx_gallery_show (is_active, album, sort_order)` and the existing
`listGallery(env, album, limit)` (`src/lib/content.ts:325`) were already written for.

Scope is **5 events**.

## Decision

**`gallery_items.album` holds the event slug. No migration, no foreign key.**

- `/gallery/<event-slug>` → `listGallery(env, slug)`.
- `/gallery` → all photos in one grid (a flat river; correct at ~50, wrong past ~500).
- `/events/<slug>` → the same `GalleryGrid` component, filtered.
- Non-event albums (office, team) keep using `album` as a plain name; the namespaces share
  one column by convention.

Explicitly **rejected**:
- **An `event_id` foreign key.** Correct in principle; at 5 events it buys referential
  integrity in exchange for a migration, a new index, and a changed `listGallery` signature.
- **A separate `albums` table.** Over-engineering at this scale.
- **`events.photos_json`,** mirroring the `partners.gallery_json` pattern
  (`src/pages/partnerships/[slug].astro:32`). This was the *laziest* option, and the grill
  otherwise consistently chose the laziest mechanism — but it was rejected here on the
  grounds that the actual disease in this codebase is **photo-mechanism proliferation**
  (`gallery_items`, `partners.gallery_json`, `hero_slides`, `events.cover_image` — four
  surfaces already). A fifth would treat the symptom and feed the disease.

## Consequences

- **Positive:** zero migration; the existing index, the existing query helper, and the
  existing admin CRUD all work unchanged; the feature reduces to adding routes and wiring a
  component that already exists.
- **Negative / risks:**
  - **No referential integrity.** Renaming an event slug orphans its photos silently. Slugs
    are `<title>-<hash>` and stable in practice, which is the whole basis for accepting this.
  - Event albums and non-event albums share one namespace with nothing enforcing the split.
  - A typo in `album` produces an invisible album rather than an error — the admin field is
    free text (`src/lib/admin.ts:342`), not a select over event slugs.
  - Migrating to a real FK later requires backfilling rows written under the convention.
- **Reversible?** Moderately. Adding an `event_id` column later is a straightforward
  `ALTER TABLE` plus a slug→id backfill, and the volume is small enough that the backfill
  stays cheap. It gets more expensive the longer the gallery grows.
