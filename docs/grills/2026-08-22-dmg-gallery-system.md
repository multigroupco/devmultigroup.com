---
title: "DMG website — a real gallery system"
date: 2026-08-22
slug: dmg-gallery-system
status: resolved
mode: grill (with recommendations — user asked for a call on every question from Q2 onward)
delivery: AskUserQuestion (structured) + prose
feature: Photo gallery for devmultigroup.com — storage, ingest, data model, delivery
---

# Grill — DMG gallery system

## Feature Identified (pre-session)

Furkan wants "a sensible gallery system" on devmultigroup.com. ~30GB of community
photos currently sit in Google Drive. Open questions he names himself: *how*, and
*should it be R2*. He suspects some infrastructure already exists but isn't sure.

**Trigger:** new design / rethinking a dormant layer. The idea is unformed — he
explicitly asked to have it grilled before committing.

## Grounding (pre-grill homework)

*Codebase facts checked before asking anything:*

- **The gallery is already scaffolded — and completely dead.** Every layer exists
  except the one that matters:
  - `migrations/0001_init.sql:97` — `gallery_items` table: `id, title, caption,
    image_key, image_url, album, width, height, taken_at, sort_order, is_active`,
    indexed `(is_active, album, sort_order)`.
  - `src/components/GalleryGrid.astro` — CSS-columns masonry + hover captions +
    a lightbox (`window.__dmgGallery`). **Imported by zero pages.**
  - `src/lib/content.ts:325` — `listGallery(env, album?, limit)`, KV-cached under
    `NS.gallery`. **Called by zero pages.**
  - `src/lib/admin.ts:325` — a full `gallery` admin CRUD resource (image upload
    field, album as free text, taken_at, sort_order).
  - `wrangler.jsonc` — R2 bucket `devmultigroup-media` bound as `MEDIA`.
  - `src/pages/media/[...key].ts` — streams R2 objects, `cache-control:
    public, max-age=31536000, immutable`.
  - `src/pages/admin/upload.ts` — **single file, 8MB cap, image-only**, writes to
    `uploads/<ts>-<rand>.<ext>`, returns `/media/<key>`. Built for the markdown
    editor (paste/drag-drop), not for bulk ingest.
  - **There is no `/gallery` route.** `src/pages/` has no gallery page at all.
- So "R2 mi?" is already answered in the affirmative *for the plumbing* — R2 +
  a serving route + immutable caching is live and in use today. The unanswered
  parts are: bulk ingest, derivatives/resizing, data model beyond a free-text
  `album`, and whether 30GB belongs on the public web at all.
- `album` is a **free-text TEXT column with no FK**. `events` (with `slug`,
  `starts_at`, `city`, `community`, `cover_image`) is a separate table with no
  link to photos. Six years of events exist as rows; the photos are orphans.
- **KVKK work already exists in this repo**: `docs/kvkk/{ANALIZ,KARARLAR,
  UYGULAMA-PLANI}.md` plus drafted `aydinlatma-metni`, `cerez-politikasi`,
  `eposta-bulten-onay-metni`. There is a `kvkk_consent_audit` migration (0005).
  Publishing 30GB of identifiable attendee faces lands squarely inside that work.
- No `docs/terms.md` and no `docs/conventions.md` in this repo. One ADR exists
  (`0001-kunye-central-identity-provider`), unrelated to media.

## Session

### Q1 — What is the gallery *for*?

**Context:** the repo has a full gallery scaffold (`gallery_items` + `GalleryGrid.astro`
+ admin CRUD + R2 + `/media/[...key]`) and no `/gallery` route. So the question is not
"can we", it's "what product is this".

**Question:** Who lands on `/gallery` and what are they trying to do — showcase/proof
for a stranger, or archive/find-myself for an attendee?

**Answer:** **Both, layered.** A curated showcase on top (home page + event page covers),
a "all photos" archive layer underneath. Two products, two cost profiles, one data model.

**Notes:** This is the most expensive answer of the four — it inherits the curation cost
of the showcase *and* the volume/KVKK/egress cost of the archive. Every subsequent branch
now has to be answered twice (once per layer) or explicitly collapsed.

### Q2 — How does showcase curation actually happen?

**Context:** the showcase admin already exists (`src/lib/admin.ts:325`) with per-photo
title/caption/album/sort_order, and `scripts/seed.sql` contains **zero** `gallery_items`
rows after ~6 years of events. Meanwhile the only gallery actually rendering pixels is a
competing mechanism — `partners.gallery_json`, a hand-written JSON blob rendered at
`src/pages/partnerships/[slug].astro:32`. Evidence: the bottleneck is human labour, not
storage, and the laziest mechanism wins.

**Question:** Who decides "this frame goes in the showcase", on what trigger, and what
happens to the 6-year backlog?

**Recommendation given:** don't build a separate curated collection. `events` already has
`cover_image` + `slug` + `starts_at` + `city`, so the showcase can be the event-cover grid
— **one** decision per event, already being made at publish time, backlog ≈ already paid.

**Answer:** **Event covers + auto-highlights.** Showcase = grid of `events.cover_image`.
Inside each event page, an "öne çıkanlar" strip is auto-picked (sort_order / EXIF); a
human only hides a bad frame or pins a good one. No separate showcase table, no ritual.

**Notes:** Kills the curation-ritual branch (rejected on repo evidence) and the AI-scoring
branch (rejected as premature — solving the second problem before ingest works).
Consequence: `gallery_items` now serves the archive only, and every event needs a
`cover_image` — that becomes a small, bounded backfill task instead of an unbounded one.

### Q3 — Who can see the archive layer?

**Context (contradiction surfaced):** `docs/kvkk/KARARLAR.md:78` records *"Özel nitelikli veri
… toplamıyoruz — sadece ad/e-posta/mesaj/sipariş → VERBİS ekonomik istisna varsayımı."*
Publishing identifiable attendee faces stresses three points at once: photos are **absent
from the declared data inventory**, `docs/kvkk/taslaklar/aydinlatma-metni.md` is **silent**
on them, and a face-search "find yourself" feature would be **biometric processing** —
directly against the recorded decision.

**Context (in his favour):** devmultigroup.com is **already a Warden OIDC relying party**
(`src/lib/oidc.ts`, `/auth/{login,callback,logout}`); `src/middleware.ts:52` already reads
the session and checks `ADMIN_ROLES`. Gating a route on "logged in at all" is a one-line
role-check difference — no new RP registration (a known-broken path).

**Recommendation given:** archive behind Warden — smaller KVKK surface, no Google indexing
of ~30k faces, and the decision stays reversible (you can open later; you cannot un-index).

**Answer (off-target — redirected the branch):** *"arşiv olarak kullanmak daha mantıklı
curated bir liste olarak, hem event'e bağlı bir yerden girişi olsun hem de direkt kendi
route'u da olsun."*

**Notes:** He did not answer access. He instead **redefined the archive as curated**, which
shrinks the KVKK surface enough that the access question is no longer blocking — but it is
**still open** and carried to the ledger. Two structural consequences named back to him:
(a) if only a curated set goes online, the 30GB never reaches the web — the original "30GB
in Drive" problem becomes a *backup* question this grill does not solve; (b) a curated
archive **re-opens the labour branch closed in Q2**.

**Open branch:** archive access model (public vs Warden-gated) — deferred, not resolved.

### Q4 — What is the unit of curation?

**Context:** `scripts/events-archive.sql` holds **78 past events**, every one with a
`cover_image` already set as an R2 key (`events/<slug>.png`). With `scripts/events.sql`
that is **~87 events, of which 46 are physical** (41 are online bootcamps with no photos),
all in İstanbul. So the showcase layer from Q2 is **already fully populated in data** — it
only lacks a route. And 30GB across 46 physical events ≈ 650MB/event.

**Question:** does "curated" mean picking which *events* get a gallery, or which *frames*
get uploaded? (46 yes/no decisions vs ~1,150 frame decisions.)

**Recommendation given:** unit = **event**, not frame — 46 yes/no calls, start with the
10–15 flagship ones, upload the folder as-is, let Q2's auto-highlights carry quality.

**Answer:** **"son 5 etkinlik olsa kâfi, hepsi burada var zaten, ben gelir imagelarını
yüklerim."** — only the last 5 events need galleries; he uploads manually.

**Notes:** Major scope collapse, and the right instinct. This deletes the bulk-ingest
pipeline, the Drive→R2 migration, and most of the volume/cost question. What survives:
**5 events × N photos, uploaded by hand.** Which makes the upload mechanism itself the
next load-bearing question — `src/pages/admin/upload.ts` is single-file and caps at 8MB,
below a raw camera JPEG.

### Q5 — What size are photos stored and served at?

**Context:** there is **no image-transformation layer anywhere** — zero `/cdn-cgi/image/`
usage, no Cloudflare Images. `src/pages/media/[...key].ts` returns the uploaded bytes
verbatim. `src/pages/admin/upload.ts` caps at **8MB**, below a raw camera JPEG (4–12MB),
so a hand-upload of shoot originals would be rejected at the door; the ones that passed
would make a 30-photo masonry grid a ~150MB mobile page load. Also noted: a **third**
photo surface exists — `hero_slides` (`src/lib/admin.ts:205`), the homepage hero strip.

**Recommendation given:** resize in the browser before POST — canvas → 2000px webp (~300KB)
plus a 400px thumb, both written to R2. No new binding, no new subscription, no new cost,
and the 8MB ceiling stops mattering.

**Answer:** **Browser-side resize.** Originals stay in Drive.

**Notes:** This promotes an accidental split into a deliberate one — **Drive = original
archive, R2 = web derivatives**. Consequence to handle at build time: EXIF orientation must
be applied during the canvas resize or portrait shots will render sideways. Second
consequence: a future "download the original" feature cannot be served from R2.

### Q6 — How does a photo bind to an event?

**Context:** `gallery_items.album` is free-text TEXT with no FK; `events` has no link to
photos. The existing index `idx_gallery_show (is_active, album, sort_order)` and
`listGallery(env, album, limit)` (`src/lib/content.ts:325`) are already written for exactly
an "album's photos, ordered" query.

**Recommendation given:** no migration — use `album` as the event slug.

**Answer:** **`album` = event slug, no migration.**

**Notes:** `/gallery` becomes `SELECT DISTINCT album` joined to `events` on slug;
`/gallery/<event-slug>` is `listGallery(env, slug)`; the event page links across. Accepted
risk: no referential integrity — renaming an event slug orphans its photos. Slugs are
`<title>-<hash>` and stable in practice. Explicitly **rejected**: adding a fourth photo
mechanism (`events.photos_json`) even though it is the laziest option — the disease in this
codebase is mechanism proliferation (`gallery_items`, `partners.gallery_json`,
`hero_slides`), and option 4 would treat the symptom while feeding the disease.

### Q7 — What is the ingest path for the photos?

**Context (correction to Q5):** the repo already has the bulk-media convention —
`scripts/media-sync.sh` pushes a folder into the R2 MEDIA bucket with per-extension
content-types (`remote`/`local`), and `scripts/store-seed-images.sh` shows the full shape:
`wrangler r2 object put` + `wrangler d1 execute` + **a KV cache-version bump** (`cv:<ns>`),
because a direct D1 write does not bump the stamp in `src/lib/cache.ts` and the content
would stay invisible. That makes local `sips -Z 2000` the natural resize point (and it
handles EXIF orientation for free), not the browser canvas recommended in Q5. Q5's
decision stands; only *where* the resize happens was corrected.

**Also flagged:** `media-sync.sh` reads from `public/`, so gallery photos placed there would
ALSO be copied into `dist/` and shipped in the Worker asset bundle — every photo stored
twice. A gitignored staging dir (`media-src/gallery/<slug>/`) avoids that.

**Recommendation given:** extend `media-sync.sh`.

**Answer:** **existing one-at-a-time admin CRUD.** No new script, no new page.

**Notes:** Chosen against the recommendation. Accepted — but it is only compatible with
Q4's "upload the folder as-is" if the per-event count is small, which forced Q8.

### Q8 — What makes one-at-a-time CRUD survivable?

**Context (third dead thing):** `GalleryGrid.astro` never reads `width`/`height` — the
`<img>` carries no intrinsic dimensions, only CSS columns. So two schema columns and two
manual number inputs in the admin form drive nothing (and their absence is why the grid
reflows as each photo loads). The gallery form asks for **8 fields per photo**.

**Recommendation given:** cap at 8–12 photos/event and delete the
`width`/`height`/`taken_at`/`sort_order` fields from the gallery form (`src/lib/admin.ts`
:342–345) — four lines, no new page, no JS.

**Answer:** **8–12 photos + trim the form.** ~50 uploads total, ~2 interactions each,
one evening of work. R2 footprint ≈ 20MB.

**Notes:** This finally answers the original "R2 ile mi?" with a number — **~20MB**, i.e.
about **$0.0003/month** of R2 storage. Storage was never the problem; the problem was
labour, and every decision in this session has been a labour decision.

### Q9 — Access model + the KVKK debt (the branch deferred from Q3)

**Context:** the Q3 recommendation (Warden-gate the archive) was made against a 30GB /
~30k-face archive. Q4 collapsed that to ~50 curated frames, so the recommendation was
**withdrawn**: a login wall in front of 50 photos destroys the showcase's whole reason to
exist (proof, shown to a stranger). The KVKK debt does not vanish with scale, though —
`aydinlatma-metni.md` is still silent on photos and `KARARLAR.md:78` still declares an
inventory that excludes them.

**Recommendation given:** public, plus one paragraph in `aydinlatma-metni.md` (photos are
taken at events, published for promotion under legitimate interest, right to object) and a
visible "remove my photo" contact line on the gallery page.

**Answer:** **Public + aydınlatma clause + takedown line.**

### Q10 — What does `/gallery` render?

**Recommendation given:** a flat photo river — `/gallery` renders all ~50 photos in one
`GalleryGrid`; the event page calls the same component filtered by `listGallery(env, slug)`.
Two routes, one component, no new design work.

**Answer:** **Flat photo river.**

**Notes:** Correct at 50 photos; breaks at 500. The album-list route is the documented
upgrade path if the gallery ever grows past ~10 albums.

## Outcome

**The scope collapsed from a data-migration project to one evening of work.** The opening
frame ("30GB in Drive, should it be R2?") turned out to be the wrong question: storage was
never the constraint — **~50 photos × ~300KB ≈ 20MB ≈ $0.0003/month of R2**. Every real
constraint in this session was human labour, and every decision was made by choosing the
mechanism that survives having no one to run it.

### Resolved

| # | Decision | Call |
|---|---|---|
| Q1 | Product shape | Layered: showcase + archive |
| Q2 | Showcase curation | `events.cover_image` grid + auto-highlights. **Data already complete** — all 78 archived events carry a cover R2 key; only a route is missing |
| Q3/Q9 | Access + KVKK | **Public**, plus a photo clause in `aydinlatma-metni.md` and a visible takedown line |
| Q4 | Curation unit + scope | Unit = event. **Last 5 events only.** No bulk ingest, no Drive→R2 migration |
| Q5 | Derivatives | Resize before upload; originals stay in Drive. **Drive = original archive, R2 = web derivatives** |
| Q6 | Data model | `album` = event slug. **No migration.** Existing index + `listGallery()` already fit |
| Q7 | Ingest path | Existing one-at-a-time admin CRUD (chosen against recommendation) |
| Q8 | Volume + form | 8–12 photos/event (~50 total); delete `width`/`height`/`taken_at`/`sort_order` from the gallery form |
| Q10 | Route shape | `/gallery` = flat photo river; event page = same component, filtered |

### Explicitly out of scope

- **The 30GB in Drive.** It stays in Drive and this grill does not solve it. No backup,
  retention, or archival decision was made — that is a separate question.
- **Photo-mechanism consolidation.** The repo now has *four* photo surfaces:
  `gallery_items` (becoming primary), `partners.gallery_json`, `hero_slides`, and
  `events.cover_image`. Not discussed; deliberately not expanded.

### Build notes / gotchas found while grilling

1. **`sort_order` removal changes ordering.** Default sort is
   `sort_order ASC, COALESCE(taken_at, created_at) DESC`. Drop the field and every row is
   `0`, so the tiebreak becomes `created_at DESC` — photos render in **reverse upload
   order**. Either keep `sort_order` hidden-with-a-default, or accept reverse order.
2. **`GalleryGrid` causes layout shift.** The `<img>` has no intrinsic dimensions and the
   `width`/`height` columns are never read. Set an `aspect-ratio` (or restore the
   attributes) or the masonry reflows on every load.
3. **Resize must apply EXIF orientation** or portrait shots render sideways. `sips -Z 2000`
   handles it; a browser canvas resize does not, by default.
4. **Never stage gallery photos in `public/`** — Astro copies them into `dist/`, so each
   photo would ship twice (R2 + Worker asset bundle).
5. **Every event needs a `cover_image`** for the showcase grid. The 78 archived ones have
   them; new events must not skip it.
6. `/gallery` needs adding to nav + sitemap — not covered by any decision above.

### Risks accepted

- **No referential integrity between photos and events.** Renaming an event slug orphans
  its photos (Q6).
- **Originals are unreachable from the web.** A future "download the original" feature
  cannot be served from R2 (Q5).
- **The flat river breaks past ~500 photos** (Q10).
- **A public gallery cannot be un-indexed.** The Warden-gated option remains available for
  a *future* larger archive, but not retroactively for these 50 frames (Q9).

### ADRs recorded

All three candidates passed the hard-to-reverse + surprising + real-trade-off gate and were
written at the close of this session:

- [`docs/adr/0002-drive-originals-r2-derivatives.md`](../adr/0002-drive-originals-r2-derivatives.md)
  — Drive is the original photo archive; R2 stores only web derivatives. (Q5, Q7)
- [`docs/adr/0003-public-event-photography.md`](../adr/0003-public-event-photography.md)
  — event photographs are published publicly, amending the inventory recorded at
  `docs/kvkk/KARARLAR.md:78`. (Q3, Q9)
- [`docs/adr/0004-gallery-album-is-an-event-slug.md`](../adr/0004-gallery-album-is-an-event-slug.md)
  — photos bind to events by slug convention, not a foreign key. (Q6)

### Glossary

`docs/terms.md` did not exist and was created at the close of this session, seeded with the
gallery vocabulary this grill disambiguated — chiefly **arşiv**, which was used here to mean
*a curated set*, not the ~30GB of Drive originals (now named **ham arşiv**).
