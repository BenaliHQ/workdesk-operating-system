#!/usr/bin/env bash
# Preflight checks for the WorkdeskOS Plugin build.
#
# Verifies the toolchain, auth, and network reachability that every
# downstream phase relies on. Does NOT check target-repo emptiness — that
# is M1's Step 0a (preflight.sh itself lives inside the target repo and
# would always self-fail after Step 0b writes it).
#
# Exits 0 on PASS, 2 on any FAIL.

set -uo pipefail
PASS=0
FAIL=0
WARN=0

ok()   { printf "  ok  · %s\n" "$1"; PASS=$((PASS+1)); }
fail() { printf "  FAIL · %s\n" "$1"; FAIL=$((FAIL+1)); }
warn() { printf "  warn · %s\n" "$1"; WARN=$((WARN+1)); }

echo "[preflight] WorkdeskOS Plugin"

# node ≥ 22
if command -v node >/dev/null 2>&1; then
  v=$(node --version | sed 's/v//')
  major=${v%%.*}
  if [ "${major:-0}" -ge 22 ]; then ok "node $v"; else fail "node $v (< 22)"; fi
else fail "node missing"; fi

# pnpm ≥ 10
if command -v pnpm >/dev/null 2>&1; then
  v=$(pnpm --version)
  major=${v%%.*}
  if [ "${major:-0}" -ge 10 ]; then ok "pnpm $v"; else fail "pnpm $v (< 10)"; fi
else fail "pnpm missing"; fi

# git + git identity
if command -v git >/dev/null 2>&1; then
  ok "git $(git --version | awk '{print $3}')"
  email=$(git config --get user.email || true)
  name=$(git config --get user.name || true)
  if [ -z "$email" ] || [ -z "$name" ]; then
    fail "git identity unset — run: git config user.email/user.name"
  else ok "git identity: $name <$email>"; fi
else fail "git missing"; fi

# curl
if command -v curl >/dev/null 2>&1; then ok "curl"; else fail "curl missing"; fi

# python3 ≥ 3.8
if command -v python3 >/dev/null 2>&1; then
  v=$(python3 --version 2>&1 | awk '{print $2}')
  major=${v%%.*}
  rest=${v#*.}
  minor=${rest%%.*}
  if [ "${major:-0}" -ge 3 ] && [ "${minor:-0}" -ge 8 ]; then ok "python3 $v ($(command -v python3))"; else fail "python3 $v (< 3.8)"; fi
else fail "python3 missing"; fi

# shasum
if command -v shasum >/dev/null 2>&1; then ok "shasum"; else fail "shasum missing"; fi

# claude
if command -v claude >/dev/null 2>&1; then
  ok "claude $(claude --version 2>&1 | head -1)"
  if claude auth status >/dev/null 2>&1; then
    ok "claude authenticated"
  else
    warn "claude auth status non-zero (may still work for non-API operations)"
  fi
else
  warn "claude CLI missing (only needed for /goal-driven multi-session builds)"
fi

# context7 MCP (best-effort)
if command -v claude >/dev/null 2>&1; then
  if claude mcp list 2>/dev/null | grep -qi context7; then
    ok "Context7 MCP available"
  else
    warn "Context7 MCP not detected — sessions will fall back to WebFetch"
  fi
fi

# design-handoff source path
SRC="/Users/khalilbenali/Workdesk-OS/gtd/projects/WorkdeskOS-Plugin/reference/design-handoff"
if [ -d "$SRC" ]; then ok "design-handoff source path: $SRC"; else fail "design-handoff missing at $SRC"; fi

# network — pinned terminal source
TERM_URL="https://raw.githubusercontent.com/BenaliHQ/workdesk-terminal/297fea0a2194c97426b67a8c9040c73035b8ce65/main.ts"
if curl -sSfI -o /dev/null "$TERM_URL"; then ok "network: pinned workdesk-terminal reachable"; else warn "network: $TERM_URL unreachable (cached copy still usable)"; fi

# network — npm registry
NPM_URL="https://registry.npmjs.org/@xterm/xterm/-/xterm-5.5.0.tgz"
if curl -sSfI -o /dev/null "$NPM_URL"; then ok "network: npm registry reachable"; else warn "network: $NPM_URL unreachable"; fi

echo "[preflight] PASS=$PASS FAIL=$FAIL WARN=$WARN"
[ $FAIL -eq 0 ] && exit 0 || exit 2
