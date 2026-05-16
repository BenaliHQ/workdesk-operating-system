#!/usr/bin/env bash
# Verifies the symlinked plugin install.
# Usage: bash scripts/install-check.sh <vault-path>

set -uo pipefail

VAULT="${1:-}"
if [ -z "$VAULT" ]; then
  echo "Usage: bash scripts/install-check.sh <vault-path>" >&2
  exit 2
fi

DEST="$VAULT/.obsidian/plugins/workdesk-operating-system"
if [ ! -d "$DEST" ] && [ ! -L "$DEST" ]; then
  echo "[install-check] FAIL: $DEST missing (symlink the repo there first)" >&2
  exit 2
fi

PASS=0; FAIL=0
ok()   { echo "  ok  · $1"; PASS=$((PASS+1)); }
nope() { echo "  FAIL · $1"; FAIL=$((FAIL+1)); }

for f in manifest.json main.js styles.css; do
  [ -f "$DEST/$f" ] && ok "$f present" || nope "$f missing"
done

if [ -f "$DEST/manifest.json" ]; then
  id=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DEST/manifest.json','utf8')).id)")
  [ "$id" = "workdesk-operating-system" ] && ok "manifest id = $id" || nope "manifest id = $id"
fi

if [ -d "$DEST/fonts" ]; then
  n=$(find "$DEST/fonts" -name '*.woff2' | wc -l | tr -d ' ')
  [ "$n" -ge 1 ] && ok "fonts/ present ($n .woff2)" || nope "fonts/ empty"
else
  nope "fonts/ missing"
fi

echo "[install-check] PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 2
