# 0003 — Event photographs are published publicly, amending the recorded KVKK inventory

- **Status:** Accepted
- **Date:** 2026-08-22
- **Context source:** `docs/grills/2026-08-22-dmg-gallery-system.md` (Q3, Q9)

## Context

The gallery publishes photographs of identifiable attendees at Developer MultiGroup events.
Three things in this repo were in tension with that:

1. `docs/kvkk/KARARLAR.md:78` records: *"Özel nitelikli veri (din/sağlık/üyelik/biyometrik
   vb.) toplamıyoruz — sadece ad/e-posta/mesaj/sipariş → VERBİS ekonomik istisna
   varsayımı."* **Photographs appear nowhere in that inventory.**
2. `docs/kvkk/taslaklar/aydinlatma-metni.md` is **silent on photography** entirely.
3. A "find yourself" feature implemented via face matching would be **biometric
   processing** — squarely against the recorded decision.

The access question was first grilled against a ~30GB / ~30k-face archive, where the
recommendation was to gate the archive behind Warden (devmultigroup.com is already an OIDC
relying party — `src/lib/oidc.ts`, and `src/middleware.ts:52` already reads the session, so
gating on "logged in at all" is a one-line role-check difference). Scope then collapsed to
**~50 curated frames**, and that recommendation was withdrawn: a login wall in front of 50
photos destroys the showcase's entire purpose, which is proof shown to a *stranger*.

## Decision

**The gallery is public.** No authentication, indexable, linkable.

Two obligations ship with it, and the gallery does not go live without them:

- **`docs/kvkk/taslaklar/aydinlatma-metni.md` gains a photography clause**: that photographs
  are taken at events, that they are published for promotional purposes under legitimate
  interest (meşru menfaat), and that the subject has a right to object.
- **The gallery page carries a visible takedown line** — a contact route for "remove my
  photograph", reachable without logging in.

Explicitly **not** adopted:
- **No face search, no face matching, no face tagging.** That would be biometric processing
  and is out of bounds under `KARARLAR.md:78`, which this ADR does not amend on that point.
- No consent-collection change at event registration. Legitimate interest plus notice plus
  takedown is the basis; per-attendee consent is not collected.

## Consequences

- **Positive:** the showcase does the job it exists to do — a stranger, a sponsor, or a
  prospective speaker sees six years of real events with no barrier; the declared KVKK
  position and the shipped site stop contradicting each other; the takedown path is a
  one-line addition rather than an apparatus.
- **Negative / risks:**
  - **A public gallery cannot be un-indexed.** Search engines and archives will hold copies
    regardless of later deletion. The Warden-gated option stays available for a *future*
    larger archive but cannot be applied retroactively to these frames.
  - Legitimate interest is an assessed basis, not an automatic one. If an attendee objects,
    the answer is removal, not argument — hence the takedown line is load-bearing.
  - **No retention period for photographs is set.** They currently live indefinitely.
  - The `KARARLAR.md:78` inventory now needs updating; leaving it stale is worse than never
    having written it, because it is self-authored evidence of the contradiction.
- **Reversible?** Hard, in the direction that matters. Taking the gallery private later does
  not retract what was indexed while it was public.

## Deferred

- A retention period for event photographs.
- Whether a *future* full archive (the ~30GB in Drive, if it ever ships) inherits this
  decision or gets Warden-gated — the grill's recommendation for that case was to gate it.
