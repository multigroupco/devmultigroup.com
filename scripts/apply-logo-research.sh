#!/usr/bin/env bash
# Download researched logos, normalise (trim + transparent white bg, keep colour),
# write public/logos/<slug>.png, and emit scripts/logo-research-update.sql.
# Usage: scripts/apply-logo-research.sh <scratchpad_dir>
set -uo pipefail
SC="${1:?scratchpad dir}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$SC/logodl"; mkdir -p "$TMP" "$ROOT/public/logos"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

python3 - "$SC" <<'PY'
import json,sys
SC=sys.argv[1]
d=json.load(open(f"{SC}/logoresearch.json"))
res=d.get("results",d) if isinstance(d,dict) else d
with open(f"{SC}/logo_research.tsv","w") as f:
    for r in res:
        u=r.get("logo_url")
        if u: f.write(f"{r['slug']}\t{u}\t{r.get('format') or ''}\n")
PY

ok=0; fail=0; > "$SC/logo_research_ok.txt"
while IFS=$'\t' read -r slug url fmt; do
  [ -z "$slug" ] && continue
  raw="$TMP/$slug.src"; rm -f "$raw"
  curl -fsSL --max-time 30 -A "$UA" "$url" -o "$raw" 2>/dev/null || { echo "DL-FAIL $slug"; fail=$((fail+1)); continue; }
  [ -s "$raw" ] || { echo "EMPTY $slug"; fail=$((fail+1)); continue; }
  # detect svg
  head -c 600 "$raw" | grep -qi "<svg" && fmt="svg"
  png="$TMP/$slug.png"
  if [ "$fmt" = "svg" ]; then
    rsvg-convert -h 320 "$raw" -o "$png" 2>/dev/null || { echo "SVG-FAIL $slug"; fail=$((fail+1)); continue; }
  else
    cp "$raw" "$png"
  fi
  # normalise: remove near-white bg -> transparent, keep colour, trim, pad, resize
  out="$ROOT/public/logos/$slug.png"
  magick "$png" -background none -alpha on -fuzz 10% -trim +repage \
    -bordercolor none -border 16 -resize 'x140>' "$out" 2>/dev/null || { echo "MAGICK-FAIL $slug"; fail=$((fail+1)); continue; }
  # validate: width >= 24px
  w=$(magick "$out" -format "%w" info: 2>/dev/null || echo 0)
  if [ "${w:-0}" -lt 24 ]; then echo "TOO-SMALL $slug ($w)"; rm -f "$out"; fail=$((fail+1)); continue; fi
  echo "$slug" >> "$SC/logo_research_ok.txt"
  ok=$((ok+1))
done < "$SC/logo_research.tsv"

# emit SQL for the ones that processed
python3 - "$SC" "$ROOT" <<'PY'
import sys
SC,ROOT=sys.argv[1],sys.argv[2]
slugs=[l.strip() for l in open(f"{SC}/logo_research_ok.txt") if l.strip()]
with open(f"{ROOT}/scripts/logo-research-update.sql","w") as f:
    f.write("-- researched logos\n")
    for s in slugs:
        f.write(f"UPDATE companies SET logo_url='/logos/{s}.png', updated_at=unixepoch() WHERE slug='{s}';\n")
print("sql updates:", len(slugs))
PY
echo "processed: $ok  failed: $fail"
