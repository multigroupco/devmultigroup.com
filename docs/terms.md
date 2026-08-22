# Terms

Canonical vocabulary for devmultigroup.com. Add a term when a grill or review shows two
people meaning different things by the same word.

## Gallery

Established in `docs/grills/2026-08-22-dmg-gallery-system.md`.

- **Vitrin (showcase)** — the proof-to-a-stranger layer: the grid of `events.cover_image`.
  One image per event, decided at publish time. Not a separate collection and not a
  separate table.
- **Arşiv (archive)** — **a curated set, not a complete one.** In this codebase "arşiv"
  means the ~8–12 published frames per event, *not* the ~30GB of raw shoot originals.
  Say **ham arşiv** when you mean the Drive originals.
- **Ham arşiv (raw archive)** — the ~30GB of originals in Google Drive. Deliberately never
  uploaded to R2. Drive is the original archive; R2 holds only web derivatives.
- **Album** — a value in `gallery_items.album`. By convention it holds an **event slug**;
  there is no foreign key to `events`. Not a table, not an entity.
- **Öne çıkanlar (highlights)** — the auto-picked strip at the top of an event's photos.
  Automatic by default; a human only hides or pins.
