---
title: "2026-08-17 — Grill: the 12 open issues (#3–#14)"
date: 2026-08-17
trigger: "all 12 open issues are title-only or near-empty; user wants all of them handled in one session"
tags:
  - grill
  - backlog
  - devmultigroup
status: resolved
---

# Grill: the 12 open issues (#3–#14)

## Feature Identified (pre-session)

**Topic.** Every open issue on the repo. Ten of the twelve have an **empty body** —
the title is the entire spec. The two with bodies carry only a reference URL
(`#3`, `#5`) or a two-line checklist (`#14`). The goal of this session is to turn
those titles into specs sharp enough to implement, then implement all twelve.

**Trigger.** User asked to be grilled on the non-described issues and wants all
twelve handled in this session.

### The twelve

| # | Title | Body |
| --- | --- | --- |
| 3 | `feat(page)` journey page for disconnect events | ref: `kaft.com/journeys/pack-your-stories-cazfest` |
| 4 | `feat(page)` media / brand-kit page | *(empty)* |
| 5 | `feat(page)` custom designed collab pages | ref: `kaft.com/sustainability` + "also redesign the collabrations page entirely" |
| 6 | `feat(page)` contact page | *(empty)* |
| 7 | `feat(events)` automate event fetching with Gathin RSS (MultiGroup + MultiAcademy) | *(empty)* |
| 8 | `feat(content)` perfection pass on every public-facing generated text | *(empty)* |
| 9 | `feat(page)` editable per-person page under team, guarded behind Warden | *(empty)* |
| 10 | `feat(content)` update team | *(empty)* |
| 11 | `fix(speakers)` hero cards not properly aligned on inner placing | *(empty)* |
| 12 | `feat(events)` events page hero more sell-oriented like academy | *(empty)* |
| 13 | `fix(companies)` remove the chips, dropdown next to search instead | *(empty)* |
| 14 | `fix(animation)` page flashing on routing is back; logo sliders stagger | 2-item checklist |

### Pre-session codebase facts

- **"Collaborations page" = `/partnerships`** (`src/pages/partnerships.astro`, 187
  lines). It is fully **hardcoded**: three bespoke partner cards (Wite / Lodos /
  Google), hardcoded stat numbers (`25+`, `4`, `750+`), hardcoded image paths under
  `/media/partners/`. Nothing about it is DB-driven except `CompanyStrip`.
- `/companies` (`src/pages/companies.astro`, 200 lines) is the DB-driven one
  (migration `0006_speakers_companies.sql`), and is separate from `/partnerships`.
  Both live under the **Ekosistem** nav dropdown alongside `/communities` and
  `/speakers` (`src/lib/site.ts:46-55`).
- There is **no** `/contact` page — contact is a modal
  (`src/components/ContactModal.astro`, 211 lines) posting to `/api/contact`.
- Events already have a `source` field with a `gathin` option
  (`src/lib/admin.ts:109`) but nothing writes it automatically; `GATHIN` in
  `site.ts:89-94` holds only the two community landing URLs.
- Team is a flat grid (`src/pages/team.astro`) over `team_members`; there is no
  per-person route.

## Q&A

### Q1 — #5: what is the unit of a "custom designed collab page"?

- **Context.** `src/pages/partnerships.astro:1-187` is fully hardcoded — three bespoke
  partner blocks (Wite / Lodos / Google), hardcoded stats, hardcoded `/media/partners/`
  paths. `kaft.com/sustainability` (the cited reference) is a **single long-form
  editorial scroll**: philosophy prose → one partner block with three *animated
  comparison metrics* → a five-icon standards section. Not a card grid.
- **Question.** The issue says "collab page**s**" (plural) *and* "redesign the
  collaborations page entirely". Which is it: index + per-partner story pages, one
  long editorial page with no sub-pages, per-partner pages only, or index + pages
  with the pages DB-driven?
- **Answer.** Index + per-partner pages — *and* the index itself must be **more
  sell-oriented**, deliberately breaking away from the **current boxed/card styling**.
- **Notes.** Two things land here. (1) `/partnerships` becomes an index that routes
  into bespoke per-partner pages. (2) The index is not just re-laid-out, it changes
  *register*: the existing `.card p-6 md:p-8` stacked-box pattern is explicitly
  rejected. "Sell-oriented" = the page's job is winning the next sponsor, not
  cataloguing past ones. Still open after this answer: hardcoded vs DB-driven for the
  per-partner pages.

### Q2 — #5: bespoke files or D1 rows for the per-partner pages?

- **Context.** `migrations/0006_speakers_companies.sql:1-7` states outright that
  `companies` (orgs whose people spoke) and `communities` (partner chapters) are
  *different* from "the partnerships page (active collaborations)" — and that third
  concept has **no table**. CLAUDE.md's core promise is "all content stored in D1 …
  no redeploy is needed to change content", which "custom designed" cuts against.
- **Question.** Bespoke `.astro` per partner / one table + one strong template /
  table with per-slug bespoke overrides / table with typed section blocks?
- **Answer.** **One table, one strong template.**
- **Notes.** Design freedom is traded away for zero-deploy collabs. A new
  `partners` table (`slug, name, logo, hero_image, lede, body_md, metrics_json,
  gallery_json, accent, …`) + an `/admin/partners` resource + a single
  `src/pages/partnerships/[slug].astro`. Accepted consequence: **every partner page
  shares one silhouette** — the variation has to come from content (hero image,
  accent, metric count), not layout. Existing hardcoded Wite / Lodos / Google
  content gets seeded into the table as the first three rows. Terminology worth
  fixing in the docs: **partner ≠ company ≠ community** — three tables, three
  meanings, currently only two of them exist.

### Q3 — #3: what is a "journey" relative to an event row?

- **Context.** Disconnect already exists twice in `scripts/events-archive.sql:38,62`
  (`Disconnect!`, Facebook İstasyon, Jul 2023; `Disconnect 24 | Community Networking
  Event`, Apr 2024) — both `source='archive'`, `status='published'`. The KAFT journey
  page is a **photo essay**: place-name + coordinates → opening quote → nine images
  each with its own caption → first-person chronological voice. KAFT's own URL shape
  is generic (`/journeys/<slug>`), not event-branded.
- **Question.** Own `journeys` table at `/journeys/<slug>` / a recap attached to
  `/events/<slug>` / a `/disconnect` series page / series page + per-edition pages?
- **Answer.** "Mostly like this, where also each journey has a **sub page** too" —
  plus: *"the kaft example is the way I want, mostly — good design, vibed."*
- **Follow-up.** No option was clicked, so the index-vs-series-brand fork was read
  from the wording: a **journeys index with a sub-page per journey**, matching KAFT's
  own generic `/journeys/<slug>` shape rather than a Disconnect-only `/disconnect`
  route. Proceeding on that; Disconnect becomes the first two journeys, not the
  route name.
- **Notes.** So `/journeys` (index) + `/journeys/<slug>` (photo essay), DB-driven like
  the partner pages, with an optional link back to the `events` row. The KAFT shape is
  the design brief, near-literally: place + coordinates header, an opening pull-quote,
  then a caption-per-photo vertical sequence. Photos need per-image captions, so a
  `photos_json` (or a child table) — `gallery_items.caption` exists but its `album`
  field is free-text and unordered per-journey.

### Q4 — #7: is the Gathin RSS sync allowed to overwrite hand-edited copy?

- **Context.** The feeds are real and undocumented-but-live:
  `https://gathin.com/communities/<community-id>/rss.xml`, discoverable via a
  `<link rel="alternate" type="application/rss+xml">` on the community page.
  **MultiGroup = 20 items, MultiAcademy = 6**, newest-first, including *past* events —
  so it is a rolling window, not just upcoming. Per item the feed gives:
  `title`, `link` (the Gathin event URL → `registration_url`), `guid`
  (`togather-event-<id>`, stable → safe upsert key), `pubDate` (start time, GMT),
  `category` (always the literal `event`), `description` (long marketing prose), and
  `enclosure` (a cover image on `files-01.apiollon.com` **with a `token` query param**).
  It does **not** give: venue, city, online/offline, end time, our internal
  `category` (`meetup|workshop|bootcamp|talk|panel|hackathon`), or tags.
  `wrangler.jsonc` currently has **no `triggers.crons`** block at all.
- **Question.** A re-running sync will trample the copy #8 exists to perfect. What
  may it touch on an event it has already imported — nothing / facts only / drafts
  for review / manual-only?
- **Answer.** **Create-only, never update.** First sight of a `guid` inserts the row
  as `status='draft'`; a known `guid` is skipped entirely, forever.
- **Notes.** The accepted cost is explicit: **if Gathin moves a date or renames an
  event, the site keeps the stale value and says nothing.** In exchange, #8's
  hand-polished copy can never be clobbered by a background job. `guid` becomes the
  dedupe key, so it needs storing — a new `events.external_id` column (unique), since
  `source` alone can't identify a row. Rows land as drafts, so venue / city / internal
  category / tags are filled in by hand at `/admin/events` before publishing — the
  feed can't supply them anyway. Cover images must be **copied into R2 at import**,
  not hotlinked: the `enclosure` URL carries a `token` param that will rot.

### Q5 — #7: how does the sync fire, given the adapter pin?

- **Context.** A Cloudflare Cron Trigger invokes a `scheduled()` export, but
  `@astrojs/cloudflare` generates `dist/_worker.js` itself — adding one means
  **wrapping the pinned adapter's generated worker**, precisely what CLAUDE.md refuses
  to do elsewhere ("No `@sentry/*` dependency — intentionally, to avoid wrapping the
  pinned adapter's generated worker"). `grep -rn "scheduled\|cron"` over the repo
  returns nothing, and `scripts/postbuild.mjs` writes only `.assetsignore`.
- **Question.** Admin button only / button + external scheduler / real Cron Trigger
  via a postbuild wrapper / a separate tiny cron Worker?
- **Answer.** **Admin button only.** A POST action in `/admin/events` — "Gathin'den
  çek" — reporting how many drafts were created.
- **Notes.** "Automate" in the issue title resolves to *one-click*, not *scheduled*.
  The pin stays untouched, `postbuild.mjs` does not become load-bearing twice, and
  there is no CI secret to rotate. Accepted cost: **it runs only when clicked.** Must
  be **POST, never GET** — CLAUDE.md's own gotcha (viewport prefetch would fire a GET
  side-effect route unattended, which already cost a session-destroying
  `/auth/logout` and inflated `/go/<id>` counts).

### Q6 — #9: who edits a per-person team page?

- **Context.** `team_members` (`migrations/0001_init.sql:115-128` +
  `0002_team_active_area.sql`) has `name, role, team, bio, avatar_url, community,
  socials, sort_order, is_active` — but **no `slug`** (so no route) and **no `email`**
  (so no way to match a Warden identity to a row). `/admin*` is all-or-nothing:
  `ADMIN_ROLES = new Set(["super-admin", "admin"])` (`src/lib/oidc.ts:143`), enforced
  at `src/middleware.ts:61`. There is no "this row belongs to you" concept anywhere.
- **Question.** Self-service on own row / admins only / self-service with approval /
  private internal directory?
- **Answer.** **Admins only.** Public page at `/team/<slug>`; editing stays in the
  existing `/admin/team` resource, extended with the long-form profile fields.
- **Notes.** "Guarded behind Warden" turns out to mean *the existing guard*, not a new
  one. No `member` role, no email-matching, no second auth tier, no approval queue —
  the whole new-authorization branch is cut. Only `team_members.slug` is needed (plus
  whatever profile fields the richer page wants). Accepted cost: **every bio edit goes
  through an admin.** This also keeps #8 honest — no unreviewed prose can reach the
  public site.

### Q7 — #10: what is actually stale about the team?

- **Context.** `scripts/seed.sql:59-85` seeds **26 members**, every one with
  `bio=''`, `avatar_url=''`, `socials='{}'`, and all `community='multigroup'`.
  Tiers in use: Partner Manager, Executive, Associate, Pioneer, Initiate, Veteran.
  Teams: Web Development, Data Science, Mobile Development, Design, QA, Operation,
  Social Media, Communities · DevRel, Luminary Community.
- **Question.** Roster stale / empty fields to fill / MultiAcademy missing /
  taxonomy wrong?
- **Answer.** Narrow and concrete: **"gizem needs to be removed and also dalida."**
- **Notes.** #10 is far smaller than the empty rows suggested — it is not a content
  backfill, just two departures: **Gizem Arpay (`team-08`)** and **Dalida Dikici
  (`team-10`)**. Everything else stands: the roster is otherwise current, the empty
  bios/avatars are *accepted as-is*, and the taxonomy is fine. Note the knock-on for
  #9: per-person pages will render against mostly-empty rows, so the template has to
  degrade gracefully rather than assume a bio exists. Removal is a **direct D1 write**
  → `cv:team` must be bumped (CLAUDE.md's cache rule), and the two rows come out of
  `seed.sql` too so a re-seed doesn't resurrect them.

### Q8 — #6: what does a /contact page add that the modal doesn't?

- **Context.** The contact machinery is already complete. `ContactModal.astro`
  handles four types (`partner` / `sponsor` / `support` / `newsletter`) with a
  honeypot field; `src/pages/api/contact.ts:9-18` routes to `partner@` / `sponsor@` /
  `support@devmultigroup.com` with a styled HTML email, PostHog capture and Sentry
  reporting. **Five** trigger points exist: `Footer.astro:66` (support),
  `Header.astro:96,145` (newsletter), `partnerships.astro:72` (sponsor),
  `communities.astro:113` (partner).
- **Question.** Page + keep modal / page replaces modal / minimal page / contact +
  org-info hub?
- **Answer.** Page **plus org info**, and **no SSS (FAQ) section**.
- **Notes.** So: a real `/contact` route for SEO and linkability (schema.org
  `ContactPage`, nav/footer entry, deep-linkable `?type=…`) carrying the inline form,
  the three public addresses, socials, response-time expectation, and **corporate/org
  information** — but explicitly *no FAQ block*. The modal is **not** removed; all
  five in-context triggers keep working, because a sponsor CTA on the pitch page
  shouldn't navigate away from the pitch.

### Q9 — #4: who is the brand page for, and at what route?

- **Context.** Two blockers found first. (1) **`/media` is already taken** —
  `src/pages/media/[...key].ts` is the R2 binary streamer and its rest param can match
  the empty segment, so a page there collides with the handler. (2) **There is no
  vector logo**: `public/` holds only raster (`dmg-logo.webp`,
  `logo-small-black.png`, `logo-small-white.png`, `logo-wp-single.png`,
  `multiacademy-logo.png`, `multiacademy-mark-white.png`). The system itself is well
  defined and documentable: AMOLED `#000` base (`--color-ink-950`), "white is the only
  accent", and four typefaces — Hanken Grotesk (wordmark, `global.css:3-11`), Space
  Grotesk (display), Inter (body), JetBrains Mono (`global.css:59-63`).
- **Question.** Press kit / full brand guidelines / both on one page / both plus a
  generated ZIP?
- **Answer.** No scope option chosen; one hard constraint given — **"make it
  `/brand`"**.
- **Follow-up.** Scope read as **both on one page**: press kit above the fold
  (logo downloads, TR+EN boilerplate, hard facts, press contact) continuing into
  guidelines below (palette with copyable hex, four type specimens, clear-space and
  misuse). The generated-ZIP option was not taken, so downloads are per-file.
- **Notes.** Route settles to `/brand`, sidestepping the `/media` collision.
  **Open risk carried forward:** the kit ships raster-only. A brand page whose whole
  job is handing designers a usable mark is weakened by having no SVG, and that is the
  first thing an outside designer will ask for. Flagged, not solved, in this session.

### Q10 — #11 / #13 / #14: diagnosing the four bug-shaped issues before asking anything

- **Context (#11, speakers hero cards).** `src/pages/speakers.astro:120-134` — the
  "Öne çıkanlar" marquee cards are `w-60 card p-4` holding: a 14×14 avatar, an `h3`
  with `truncate` (always 1 line), a `p` with **`line-clamp-2`** (1 *or* 2 lines
  depending on title length), then the company row. Because the title block's height
  is variable and the card is not a flex column with a pushed-down footer, **the
  company logo row lands at a different vertical offset on every card** — exactly
  "not properly aligned on inner placing". Diagnosis is confident; no question needed.
- **Context (#13, companies chips).** `src/pages/companies.astro:97-102` — a
  horizontally-scrolling row of `.sector-pill` buttons ("Tümü N", then one per
  sector with a count), sitting under the `#co-search` input. There is one pill per
  distinct `companies.sector`, so the row grows without bound. Replacing it with a
  dropdown beside the search field is unambiguous; no question needed.
- **Context (#14b, staggering logo sliders).** `src/components/CompanyStrip.astro:41-51`
  — each logo is `loading="lazy"` with `class="h-7 md:h-8 w-auto"`. The `width="120"
  height="32"` attributes are overridden by `w-auto`, so **each image's real width is
  unknown until it decodes**. The track is `w-max` and animates
  `translateX(0) → translateX(-50%)` (`global.css:659-668`). As lazy images land
  *during* the animation the track's total width changes, so the `-50%` target moves
  under it — the visible jump/stagger. It reproduces on **home and `/partnerships`**
  precisely because those are the two pages that mount `CompanyStrip` (partnerships
  mounts it **twice**, `partnerships.astro:82-83`). Diagnosis is confident.
- **Context (#14a, page flashing).** Ambiguous, and the fix differs completely by
  symptom, so this one *is* worth asking. `global.css:90-92` carries a comment from a
  previous fix — "true-black base so no lighter frame can flash through during a view
  transition" — which matches "has **come back**". Meanwhile `PageLoader.astro:81-105`
  shows the overlay after a **130 ms** delay, fades it in over **300 ms**, then on
  completion waits **200 ms** before removing `is-active` and another **320 ms** to
  reset. A prefetched navigation that takes slightly over 130 ms therefore still
  paints a full-screen `rgba(0,0,0,.82)` + `blur(6px)` overlay for roughly half a
  second — itself a flash.
- **Question.** Which flash is it: the loader overlay blinking, a bare frame during
  the swap, content jumping into place, or all three?
- **Answer.** None of those exactly — **"it causes the background to flash and
  stagger while the loader is present."**
- **Follow-up.** That reframes it entirely, and the mechanism confirms out.
  `SiteBackground.astro:6-14` is `transition:persist`'d and contains **three
  continuously-animating `filter: blur(100px)` blobs** (`.blob`, `will-change:
  transform`, `animate-float-slow`) plus a `mix-blend-mode: overlay` grain layer.
  `PageLoader.astro:19-20` lays `backdrop-filter: blur(6px)` at `z-index: 9999`
  directly over that stack. A backdrop-filter whose backdrop is itself an animated
  blur + blend-mode composite forces a **full-screen re-rasterization every frame**
  while the loader is visible — the flashing, staggering background.
- **Notes.** So the bug is not the routing and not the loader's timing; it is the
  loader's *blur* interacting with the persisted animated background. The
  near-black backdrop means the blur buys almost nothing visually. Fix direction:
  drop `backdrop-filter` for a near-opaque solid, quiet the blob animation while
  `.is-active`, and raise the 130 ms show threshold so the overlay appears far less
  often in the first place.

### Q11 — #12: what is wrong with the events hero?

- **Context.** `events/index.astro:60-100` — the hero features the soonest upcoming
  event: cover image bled in from the right under a
  `bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent` scrim, title, date /
  venue line, then a four-unit countdown where each unit is a
  `w-14 h-14 rounded-xl bg-ink-950/55 backdrop-blur border border-line` box.
  `academy.astro:92-120` is the contrast: centered, a radial violet/pink/cyan glow
  behind it, value chips, dual CTA, and it sells the programme with no dependence on
  any event existing.
- **Question.** Sell first with the event below / merge both into one hero / pure
  sell and drop the countdown / keep the hero and sell beneath it?
- **Answer.** None of the restructures. Verbatim: *"böyle bişey olmasına gerek yok,
  hâlâ event ön planda olmalı — ama counter'ların box içinde oluşu ve her yerin düz
  siyah oluşunu sevmedim; hero'yu değiştirmeden daha well designed, ilgi çekici
  yapabiliriz."*
- **Notes.** #12 is **not** a restructure — the issue title ("more sell-oriented like
  academy") overstated it. The next event stays in the foreground and the countdown
  stays. Two concrete defects to fix: (1) **the countdown units read as boxes** —
  lose the bordered/blurred tile treatment for something typographic; (2) **the
  surround is flat black** — the events hero has none of the depth the academy hero
  gets from its radial glow. "Sell-oriented" here means *better designed and more
  eye-catching*, not restructured.

### Q12 — #8: what is the actual defect in the public copy?

- **Question.** AI-generated tone / wrong or stale facts / Turkish quality /
  SEO-meta text?
- **Answer.** **"I will tell them one by one — skip this one for now."**
- **Notes.** #8 is **deferred by decision**, not unresolved by omission. The user will
  raise specific copy problems individually rather than commission a blanket sweep of
  ~30 pages. Good call: a blind "perfection pass" over every public string is the kind
  of scope that silently rewrites correct copy. Worth recording for whenever it
  resumes: `partnerships.astro` hardcodes `25+ / 4 / 750+` and Google `1.5k / 30+ /
  10+`, none of which is DB-backed — those are the stalest facts on the site, and #5's
  rewrite of that page will move them into the `partners` table anyway.

## Outcome

Eleven of the twelve issues are specified well enough to build; one is deferred by
the user's own decision.

**Resolved — new surfaces**

- **#5 · `/partnerships`** — redesigned into a **sell-oriented index** that
  deliberately abandons the current stacked-`.card` boxed styling, routing into
  per-partner pages. New `partners` table + `/admin/partners` + a single
  `src/pages/partnerships/[slug].astro`. Wite / Lodos / Google seeded from the
  hardcoded markup. Accepted trade-off: every partner page shares one silhouette.
- **#3 · `/journeys` + `/journeys/<slug>`** — KAFT-shaped photo essays (place +
  coordinates, opening pull-quote, caption-per-photo sequence), DB-driven, optional
  link back to the `events` row. Disconnect supplies the first two.
- **#4 · `/brand`** — route chosen to dodge the `/media/[...key].ts` R2 collision.
  Press kit above (logo downloads, TR+EN boilerplate, hard facts, press contact),
  guidelines below (copyable palette, four type specimens, clear-space, misuse).
  Per-file downloads, no generated ZIP.
  **⏸ BLOCKED — do not start.** Post-session, the user said they will **add a
  substantial set of brand files** and will signal before work begins. Building the
  page against today's raster-only `public/` would mean laying out the asset grid
  twice, and it likely resolves the "no vector logo" risk below. #4 is the **last**
  issue to touch, and only on their go-ahead.
- **#6 · `/contact`** — real page with the inline form, the three public addresses,
  socials, response-time and **org info**; explicitly **no SSS/FAQ**. The modal and
  all five of its triggers stay.
- **#9 · `/team/<slug>`** — public per-person pages; editing stays in the existing
  `/admin/team` resource. **No new role, no email-matching, no approval queue.**
  Needs only `team_members.slug`.

**Resolved — behaviour**

- **#7 · Gathin import** — feeds confirmed live at
  `gathin.com/communities/<id>/rss.xml` (MG 20 items, MA 6, both with cover
  enclosures). **Create-only**, keyed on `guid` → a new `events.external_id`; new
  rows land `status='draft'`, known rows are never touched again. Fired by a
  **POST** button in `/admin/events` — no cron, so the pinned adapter's generated
  worker is never wrapped. Covers copied into R2 at import (the source URL's `token`
  will rot).
- **#10 · team roster** — remove **Gizem Arpay** and **Dalida Dikici**. Nothing else.
  Direct D1 write → bump `cv:team`; drop both from `seed.sql` so a re-seed can't
  resurrect them.

**Resolved — fixes**

- **#11** — `speakers.astro` marquee cards: `line-clamp-2` titles make the card
  footer sit at a different height per card. Flex column, footer pushed down.
- **#12** — *not* a restructure. Keep the next-event hero and the countdown; kill the
  boxed countdown tiles and give the flat-black surround real depth.
- **#13** — replace the unbounded `.sector-pill` row with a dropdown beside
  `#co-search`.
- **#14a** — the loader's `backdrop-filter: blur(6px)` sits over a persisted,
  continuously-animating `blur(100px)` + `mix-blend-mode` background, forcing a
  full-screen re-raster every frame. Drop the backdrop-filter, quiet the blobs while
  active, raise the 130 ms threshold.
- **#14b** — `CompanyStrip` logos are `loading="lazy"` + `w-auto`, so the `w-max`
  track's width changes as they decode and the `translateX(-50%)` target moves under
  the animation. Reserve each logo's box; don't lazy-load inside a running marquee.

**Deferred**

- **#8 · copy perfection pass** — user will raise specific problems one at a time
  rather than commission a blanket sweep. Noted for whenever it resumes:
  `partnerships.astro`'s hardcoded `25+ / 4 / 750+` and `1.5k / 30+ / 10+` are the
  stalest facts on the site, and #5 moves them into D1 regardless.

**Open risks noticed, not solved**

- **No vector logo.** As of this session `public/` is raster-only (WebP/PNG, no SVG
  or EPS) — the first thing an outside designer asks for is the one thing the page
  couldn't give. *Likely superseded:* the user is supplying a brand-file drop before
  #4 starts, so re-check what actually lands before treating this as a live risk.
- **Gathin drift is silent by design.** Create-only means a rescheduled or renamed
  event keeps its stale value on the site with no warning surface. Worth an admin
  affordance later — "this row differs from the feed" — rather than a silent skip.
- **`partner` ≠ `company` ≠ `community`.** Three distinct concepts, soon three
  tables, and only the first two are documented (`migrations/0006` header). There is
  no `docs/terms.md` in this repo to land the distinction in; if one is ever started,
  this belongs in it.
- **ADR candidate:** #7's create-only rule passes the gate — hard to reverse in
  effect (stale rows accumulate quietly), surprising (an import job forbidden from
  importing updates), and a real trade-off (freshness sacrificed for copy integrity).
  Offered, not written — `/adr` owns that.

---

## Implementation (same session, 2026-08-17)

Built and verified against a local dev server. **Nothing was committed, deployed or
pushed**, and nothing was applied to remote D1/R2/KV.

**Migration** — `migrations/0009_partners_journeys.sql` (applied local only):
`partners` + `journeys` tables; `team_members.slug/long_bio/focus/joined_at`;
`events.external_id` with a partial unique index; 24 team slugs backfilled;
`team-08` / `team-10` deleted.

| # | Built | Verified by |
| --- | --- | --- |
| 3 | `/journeys` + `/journeys/<slug>`, `journeys` table, `/admin/journeys` | both routes 200; place, coordinates, quote and the empty-photos fallback all render |
| 4 | **not started — blocked on the user's brand-file drop** | — |
| 5 | `/partnerships` rewritten (hairline editorial rows, no `.card` boxes) + `/partnerships/<slug>` + `partners` + `/admin/partners` | 3 partner pages 200; metric counters carry `data-metric` (`1.5k`, `30+`, `10+`) |
| 6 | `/contact` — 3 addresses, subject-selecting form → `/api/contact`, org info, no FAQ | 200, and `?type=sponsor` preselects |
| 7 | `src/lib/gathin.ts` + POST `action=sync-gathin` in `/admin/events` | **26 drafts imported** (20 MG + 6 MA) with covers mirrored to R2; **second run created 0, skipped 26** — create-only proven; drafts absent from public `/events` |
| 8 | deferred by the user | — |
| 9 | `/team/<slug>` + richer `/admin/team` fields; `TeamCard` now links inward | profile routes 200 |
| 10 | Gizem Arpay + Dalida Dikici removed from D1, `seed.sql` and the `SQUADS` list in `team.astro` | `/team` contains neither name |
| 11 | speaker marquee card → flex column, two-line title well, `mt-auto` footer | — |
| 12 | countdown un-boxed (typographic + hairline dividers), hero gained a blurred cover bleed and a radial wash | — |
| 13 | sector chips → `<select>` beside the search field | `sector-pill` gone from the HTML, `co-select` present |
| 14a | dropped `backdrop-filter` from the loader; blobs pause while navigating; show threshold 130→280 ms, exit hold 200→90 ms | — |
| 14b | strip logos: fixed-width boxes, `loading="eager"`, promoted track | — |

**Also touched:** `NS.partners`/`NS.journeys`; `search.ts` gained `partners` +
`journeys` types; `EVENTS` gained `content_filter`, `partner_card_click`,
`journey_card_click`; nav gained "Yolculuklar", footer gained "İletişim"; sitemap now
emits partner, journey and team-member URLs; `stat_partner_reach` added to settings.

**Environment fix required to run `astro dev`.** Wrangler 4.x opens a *remote* proxy
session for `AI`/`VECTORIZE` (no local simulation), and it failed: *"Could not create
remote preview session on your account."* The OAuth token has an `ai` scope but **no
`vectorize` scope**. Worked around with `platformProxy: { remoteBindings: false }` in
`astro.config.mjs` — which is also the behaviour `wrangler.jsonc` already documents
(VECTORIZE absent in dev, search falls back to a D1 LIKE scan). Re-running
`wrangler login` to pick up a `vectorize` scope is the real fix. Unrelated to any
issue in this sweep.

**Left for the user:**
- `npm run db:migrate:remote` + the partner/journey seed, then bump `cv:partners`,
  `cv:journeys`, `cv:team`, `cv:home` — direct D1 writes don't invalidate.
- The 26 imported drafts sit in local `/admin/events` awaiting venue, city and
  category before publishing. The feed cannot supply those.
- `/journeys/disconnect-24` and `-23` ship with `photos_json: []`. The photo essay is
  the format; without photos they are just prose.

### Revision — #3 reverted, design pass on #5 / #12 (same session)

**#3 pulled entirely, by the user's decision.** *"Disconnect kısmını komple uçuralım,
onu başka bir zaman daha düzgün kafayla yapmak istiyorum."* Removed, leaving no
residue: `src/pages/journeys/` deleted, the `journeys` table dropped from the
migration (renamed `0009_partners_team_pages.sql`, local `d1_migrations` row
updated, local table dropped — it had never been applied remotely), and every trace
gone from `types.ts`, `content.ts`, `cache.ts` (`NS.journeys`), `admin.ts`
(`RESOURCES.journeys`), `search.ts`, `events.ts` (`journeyCardClick`), the nav, the
sitemap, and both `CLAUDE.md` / `CODEMAP.md`. `scripts/partners-journeys-seed.sql`
→ `scripts/partners-seed.sql`. The Q3 record above stands as the design brief for
whenever it resumes.

**Design feedback, applied:**

| Feedback | Change |
| --- | --- |
| Events-hero gradient transition too abrupt; left column got no gradient at all, read as a crop | Three edge-free layers replace one blurred box + a single-stop scrim: `.ev-bleed` (cover, `blur(120px)`, radial-masked to nothing on every side), `.ev-wash` (light under the *text* column), `.ev-scrim` (100° gradient, 7 stops instead of the hard `to-transparent to-[54%]` seam that cut down the middle) |
| Partner index cards not really 16:9, so images sat wrong | `aspect-[16/10]` → `aspect-video`; the covers are 16:9 and the 4% mismatch was cropping them |
| Metrics should distribute evenly/centred | Index stat rail and partner-detail metric row both `text-center`, and the asymmetric `md:pl-8 md:first:pl-0` dropped so every cell is equal. Detail grid now matches the metric count (2/3/4 columns) instead of always 4 |
| The two full-width logo marquees aren't needed; want rotating partner logos beside the hero instead, in a different style from the homepage orbit | Both `CompanyStrip` rows removed. Hero became two columns; the right one is a **two-ring counter-rotating logo orbit** — 5 logos on the outer ring, 3 on the inner, turning in *opposite* directions, each counter-rotated so wordmarks stay upright, riding as **wide pills** rather than the homepage's icon circles. Hub is the MultiGroup mark; pauses and brightens on hover; `prefers-reduced-motion` stops it. Fed by `listStripCompanies` with the static `COMPANIES` fallback |
| Closing CTA should be gradient like the homepage | `border border-line` → `card card-glow` (the same violet/cyan radial the homepage join CTA uses) |

Canvas geometry note: the orbit was first laid out on a 340px square with a 148px
outer radius, which pushed the 6.5rem pills 30px past the box on each side. Widened
to 384px / radius 150 (ring insets 42px and 104px to match), leaving a 3px bleed.

**Also:** `BRAND.email` → `support@devmultigroup.com` (was `iletisim@`), which
propagates to `/contact`, the `Organization` + `ContactPage` JSON-LD, and
`llms.txt` / `llms-full.txt`.

**Orbit correction.** It was first fed from `listStripCompanies`, which put Akbank,
Trendyol, Hepsiburada, Garanti BBVA, Teknasyon, Mikro and adesso in the ring — the
logo-strip list, not the collaborations. Now fed from `partners`, so it shows only
Wite, Lodos.io and Google. With three logos the two-ring split was pointless, so it
collapsed to **one ring**, radius tightened 150→126 (`RADIUS` scales with the item
count; the dashed guide circle derives its inset from the same value so the two
can't drift). Each pill is now a **link into its partner page** — legible because
hovering or tab-focusing the orbit pauses the rotation.
