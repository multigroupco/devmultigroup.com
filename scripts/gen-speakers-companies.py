#!/usr/bin/env python3
"""Generate scripts/speakers-companies.sql from the data-intelligence workflow
output + the Excel-derived records.

Inputs (scratchpad):
  intel.json          {logos, companies, events}  (workflow result)
  recs.json           [{event, speaker, date, company}]  (254 Excel rows)
  events_seeded.json  [{id, slug, title, d, community}]  (seeded events)
Outputs:
  scripts/speakers-companies.sql
  scratchpad/logo_map.tsv     (src_logo_file \t slug)   for the image pipeline
  scratchpad/needs_logo.json  (companies still missing a usable colour logo)
  scratchpad/enrich_speakers.json (speaker list for the enrichment workflow)
"""
import json, sys, os, datetime, re, unicodedata

SC = sys.argv[1] if len(sys.argv) > 1 else "."
ROOT = sys.argv[2] if len(sys.argv) > 2 else "."

intel = json.load(open(f"{SC}/intel.json"))
recs = json.load(open(f"{SC}/recs.json"))
seeded = json.load(open(f"{SC}/events_seeded.json"))

TR = {"ç":"c","ğ":"g","ı":"i","İ":"i","ö":"o","ş":"s","ü":"u","Ç":"c","Ğ":"g","Ö":"o","Ş":"s","Ü":"u"}
def slugify(s):
    s = "".join(TR.get(c, c) for c in (s or "").strip())
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+","-", s).strip("-").lower()
    return (s or "item")[:80]

def epoch(d):
    if not d: return None
    try:
        return int(datetime.datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp()) + 9*3600
    except Exception:
        return None

def q(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(int(v))
    return "'" + str(v).replace("'", "''") + "'"

# ── companies: alias -> canonical, plus canonical metadata ──────────────────
companies = intel.get("companies", [])
alias2canon = {}
canon = {}            # slug -> record
slug_seen = set()
for c in companies:
    name = c["canonical_name"].strip()
    slug = c.get("slug") or slugify(name)
    base = slug; i = 2
    while slug in slug_seen:
        slug = f"{base}-{i}"; i += 1
    slug_seen.add(slug)
    rec = {
        "id": f"co-{slug}",
        "name": name,
        "slug": slug,
        "sector": c.get("sector") or "Diğer",
        "website": c.get("website") or "",
        "logo_file": c.get("logo_file"),
        "appearances": 0,
    }
    canon[slug] = rec
    for a in (c.get("aliases") or []) + [name]:
        alias2canon[a.strip().lower()] = rec

# ── event match: excel event name -> seeded slug ────────────────────────────
ev_match = { m["excel_event"].strip().lower(): m.get("slug") for m in intel.get("events", []) }
seeded_by_slug = { s["slug"]: s for s in seeded }

# ── speakers from recs ──────────────────────────────────────────────────────
from collections import OrderedDict
sp = OrderedDict()
for r in recs:
    name = (r.get("speaker") or "").strip()
    if not name: continue
    co_raw = (r.get("company") or "").strip()
    e = sp.setdefault(name, {"name": name, "company_raw": co_raw, "talks": []})
    if co_raw and not e["company_raw"]:
        e["company_raw"] = co_raw
    ev = (r.get("event") or "").strip()
    slug = ev_match.get(ev.lower())
    e["talks"].append({"event": ev, "date": r.get("date"), "slug": slug})

# resolve speaker company -> canonical; tally appearances
speaker_rows = []
sp_slug_seen = set()
for name, e in sp.items():
    co = alias2canon.get(e["company_raw"].lower()) if e["company_raw"] else None
    if co:
        co["appearances"] += len(e["talks"])
    sslug = slugify(name); base = sslug; i = 2
    while sslug in sp_slug_seen:
        sslug = f"{base}-{i}"; i += 1
    sp_slug_seen.add(sslug)
    dates = [epoch(t["date"]) for t in e["talks"] if epoch(t["date"]) is not None]
    speaker_rows.append({
        "id": f"sp-{sslug}",
        "name": name,
        "slug": sslug,
        "company": co["name"] if co else e["company_raw"],
        "company_id": co["id"] if co else None,
        "talks": e["talks"],
        "talk_count": len(e["talks"]),
        "first": min(dates) if dates else None,
        "last": max(dates) if dates else None,
    })

# featured companies = top 14 by appearances
ranked = sorted(canon.values(), key=lambda r: -r["appearances"])
for i, r in enumerate(ranked):
    r["sort_order"] = i
    r["featured"] = 1 if i < 14 else 0

# Build a map of available COLOUR template files keyed by company-slug, so we can
# attach colour logos by slug even when the canon agent tagged a company "EXISTING"
# (those existing repo assets are white silhouettes, useless on white tiles).
named_tpl = [
    "aktif-tech", "alleo", "appleads", "bilyoner", "exclusive-networks",
    "gelir-idaresi-baskanligi", "innova", "migros-one", "roofstacks", "sahibinden",
    "setgreet", "spyke-games", "teknasyon", "trendyol", "usersdot",
]
tpl = {nm: f"{nm}.png" for nm in named_tpl}
for l in intel.get("logos", []):
    if l.get("company"):
        tpl.setdefault(slugify(l["company"]), l["file"])

# alias -> slug helper for matching
def cand_slugs(rec, raw_aliases):
    out = [rec["slug"]]
    for a in raw_aliases:
        out.append(slugify(a))
    return out

# rebuild raw-alias lookup per canonical (slug -> list of raw alias strings)
aliases_by_slug = {}
for c in companies:
    sl = next((k for k, v in canon.items() if v["name"] == c["canonical_name"].strip()), None)
    if sl:
        aliases_by_slug[sl] = (c.get("aliases") or []) + [c["canonical_name"]]

logo_map = []          # (src_file, slug)
needs_logo = []
for r in canon.values():
    chosen = None
    for cand in cand_slugs(r, aliases_by_slug.get(r["slug"], [])):
        if cand in tpl:
            chosen = tpl[cand]
            break
    lf = r["logo_file"]
    if not chosen and lf and not lf.startswith("EXISTING:"):
        chosen = lf  # keep the agent's colour attachment (e.g. numbered file)
    if chosen:
        r["logo_url"] = f"/logos/{r['slug']}.png"
        logo_map.append((chosen, r["slug"]))
    else:
        r["logo_url"] = ""
        needs_logo.append({"name": r["name"], "slug": r["slug"], "website": r["website"]})

# ── emit SQL ────────────────────────────────────────────────────────────────
out = []
out.append("-- Generated by scripts/gen-speakers-companies.py — do not edit by hand.")
out.append("-- Companies, speakers, and event_speakers from the 6-year archive.\n")

out.append("DELETE FROM event_speakers;")
out.append("DELETE FROM speakers;")
out.append("DELETE FROM companies;\n")

cols_co = "id,name,slug,sector,logo_url,website,description,featured,sort_order,is_active"
out.append(f"INSERT OR REPLACE INTO companies ({cols_co}) VALUES")
rows = []
for r in sorted(canon.values(), key=lambda x: x["sort_order"]):
    rows.append("(" + ",".join([
        q(r["id"]), q(r["name"]), q(r["slug"]), q(r["sector"]), q(r["logo_url"]),
        q(r["website"]), q(""), str(r["featured"]), str(r["sort_order"]), "1",
    ]) + ")")
out.append(",\n".join(rows) + ";\n")

cols_sp = "id,name,slug,title,company,company_id,bio,avatar_url,socials,tags,talks,talk_count,first_talk_at,last_talk_at,featured,sort_order,is_active"
out.append(f"INSERT OR REPLACE INTO speakers ({cols_sp}) VALUES")
rows = []
for i, s in enumerate(sorted(speaker_rows, key=lambda x: (-x["talk_count"], x["name"]))):
    talks_json = json.dumps(s["talks"], ensure_ascii=False)
    rows.append("(" + ",".join([
        q(s["id"]), q(s["name"]), q(s["slug"]), q(""), q(s["company"]), q(s["company_id"]),
        q(""), q(""), q(""), q(""), q(talks_json), str(s["talk_count"]),
        q(s["first"]) if s["first"] else "NULL", q(s["last"]) if s["last"] else "NULL",
        "0", str(i), "1",
    ]) + ")")
out.append(",\n".join(rows) + ";\n")

# event_speakers (only talks matched to a seeded event)
es = []
seen = set()
for s in speaker_rows:
    for t in s["talks"]:
        slug = t.get("slug")
        if not slug or slug not in seeded_by_slug: continue
        eid = seeded_by_slug[slug]["id"]
        key = (eid, s["id"])
        if key in seen: continue
        seen.add(key)
        es.append((eid, s["id"]))
if es:
    out.append("INSERT OR REPLACE INTO event_speakers (event_id,speaker_id,role,sort_order) VALUES")
    out.append(",\n".join(f"({q(e)},{q(sp_id)},'Konuşmacı',0)" for e, sp_id in es) + ";\n")

open(f"{ROOT}/scripts/speakers-companies.sql", "w").write("\n".join(out))

# side artifacts
with open(f"{SC}/logo_map.tsv", "w") as f:
    for src, slug in logo_map:
        f.write(f"{src}\t{slug}\n")
json.dump(needs_logo, open(f"{SC}/needs_logo.json", "w"), ensure_ascii=False, indent=1)
json.dump([{"name": s["name"], "company": s["company"], "slug": s["slug"],
            "talks": [t["event"] for t in s["talks"]]} for s in speaker_rows],
          open(f"{SC}/enrich_speakers.json", "w"), ensure_ascii=False, indent=1)

print(f"companies: {len(canon)}  (logos ready: {len(logo_map)}, need logo: {len(needs_logo)})")
print(f"speakers:  {len(speaker_rows)}")
print(f"event_speakers links: {len(es)}")
unmatched = sorted({t['event'] for s in speaker_rows for t in s['talks'] if not t.get('slug')})
print(f"excel events with NO seeded match: {len(unmatched)}")
for u in unmatched: print("   -", u)
