#!/usr/bin/env bash
# Uploads the content-image folders under public/ into the R2 MEDIA bucket,
# keyed as "<dir>/<file>" (served via /media/<dir>/<file>). Content-type is set
# per extension so the /media route streams the right type.
#
#   ./scripts/media-sync.sh remote   # -> production R2
#   ./scripts/media-sync.sh local    # -> local .wrangler R2 (astro dev)
#
# Brand/infra images in public/ root (favicons, og-default, header/loader logos)
# stay static on purpose and are NOT synced here.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-remote}"
if [ "$TARGET" = "remote" ]; then FLAG="--remote"; elif [ "$TARGET" = "local" ]; then FLAG="--local"; else echo "usage: media-sync.sh [remote|local]"; exit 1; fi

BUCKET="devmultigroup-media"
DIRS=(logos main partners companies ecosystems)

ctype() {
  case "${1##*.}" in
    png) echo "image/png" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    webp) echo "image/webp" ;;
    svg) echo "image/svg+xml" ;;
    gif) echo "image/gif" ;;
    avif) echo "image/avif" ;;
    *) echo "application/octet-stream" ;;
  esac
}

n=0
for d in "${DIRS[@]}"; do
  [ -d "public/$d" ] || continue
  for f in public/"$d"/*; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    key="$d/$base"
    ct="$(ctype "$base")"
    npx wrangler r2 object put "$BUCKET/$key" --file "$f" --content-type "$ct" $FLAG >/dev/null 2>&1 \
      && { n=$((n+1)); echo "ok  $key"; } \
      || echo "FAIL $key"
  done
done
echo "== $TARGET: $n objects uploaded =="
