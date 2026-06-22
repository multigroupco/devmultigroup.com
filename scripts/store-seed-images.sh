#!/usr/bin/env bash
# Seed LOCAL product photos into R2 (STORE_MEDIA) so the ASCII→image reveal is
# visible while testing. Local only — touches nothing remote. Pulls real square
# photos (Unsplash) with an offline SVG gradient fallback if a fetch fails.
set -u
DB=devmultigroup-store-db
BK=devmultigroup-store-media
KV_ID=bfcc4b5e3680456ba38cdfcac35bad78
TMP=$(mktemp -d)

ids=(prod-body-tee prod-deploy-hoodie prod-sticker-pack prod-enamel-pin)
urls=(
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&h=900&fit=crop&q=70"   # t-shirt
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&h=900&fit=crop&q=70"       # hoodie
  "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=900&h=900&fit=crop&q=70"    # stickers / desk
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&h=900&fit=crop&q=70"    # pin / badge
)

mk_svg() { # $1=outfile  $2=label
  cat > "$1" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
  <defs><radialGradient id="g" cx="35%" cy="28%" r="85%">
    <stop offset="0" stop-color="#2c2c33"/><stop offset="1" stop-color="#050506"/>
  </radialGradient></defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <text x="50%" y="52%" font-family="monospace" font-size="58" fill="#cdcdd2" text-anchor="middle">$2</text>
</svg>
SVG
}

echo "seeding store product images (local)…"
for i in "${!ids[@]}"; do
  id="${ids[$i]}"; url="${urls[$i]}"
  f="$TMP/$id"
  if curl -sL --max-time 20 "$url" -o "$f.jpg" 2>/dev/null && file -b "$f.jpg" | grep -qiE 'JPEG|PNG|image'; then
    ext="jpg"; ct="image/jpeg"; src="foto"
  else
    mk_svg "$f.svg" "$id"; ext="svg"; ct="image/svg+xml"; src="svg-fallback"
  fi
  key="store/products/$id.$ext"
  npx wrangler r2 object put "$BK/$key" --file="$f.$ext" --content-type="$ct" --local >/dev/null 2>&1
  npx wrangler d1 execute "$DB" --local --command "UPDATE products SET images='[\"$key\"]' WHERE id='$id';" >/dev/null 2>&1
  echo "  $id -> $key ($src)"
done

# Direct D1 writes don't bump the version-stamped cache → bump store namespaces.
TS=$(date +%s)
for ns in store:products store:drops store:home; do
  npx wrangler kv key put "cv:$ns" "$TS" --namespace-id "$KV_ID" --local >/dev/null 2>&1 || true
done

echo "done. (cache bumped; restart 'npm run dev' if images don't show)"
