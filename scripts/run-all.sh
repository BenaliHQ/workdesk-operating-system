#!/usr/bin/env bash
# Legacy per-phase fallback wrapper (rev 1–5 mode).
#
# In rev 6 the operator pastes M1/M2/M3 specs via /goal directly — no wrapper
# invocation. This script remains for fallback per-phase mode. Reads
# prompts/S<N>.md if they exist. Mega-session mode (the default) skips
# generating those prompts; run-all.sh exits early in that case.
#
# Portable timeout (macOS has no GNU `timeout`):
#   portable_timeout <seconds> <cmd...>
#   exit 124 → timed out.

set -uo pipefail
cd "$(dirname "$0")/.."

SUPERVISED=0
[ "${1:-}" = "--supervised" ] && SUPERVISED=1

SESSIONS=(S1 S2 S3 S4A.1 S4A.2 S4B S5A S5B S6A S6B)
MAX_RETRIES=3
RATE_LIMIT_BACKOFF=900
PER_SESSION_TIMEOUT=3600

mkdir -p scripts/logs

bash scripts/preflight.sh || { echo "[run-all] preflight FAILED"; exit 2; }

portable_timeout() {
  local sec=$1; shift
  ( "$@" ) &
  local cpid=$!
  ( sleep "$sec" && kill -TERM "$cpid" 2>/dev/null && sleep 5 && kill -KILL "$cpid" 2>/dev/null ) &
  local wpid=$!
  local rc=0
  wait "$cpid" 2>/dev/null; rc=$?
  kill "$wpid" 2>/dev/null; wait "$wpid" 2>/dev/null || true
  case $rc in
    143|137) return 124 ;;
    *) return $rc ;;
  esac
}

if [ ! -d prompts ]; then
  echo "[run-all] prompts/ missing — mega-session mode is active."
  echo "[run-all] To use per-phase mode, materialize prompts/S<N>.md first (legacy)."
  exit 0
fi

for S in "${SESSIONS[@]}"; do
  phase_id=$(echo "$S" | tr 'A-Z' 'a-z' | sed 's/^s//')
  status=$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('STATE.json','utf8')).phases['$phase_id'].status) } catch(e) { console.log('PENDING') }")
  if [ "$status" = "PASS" ]; then
    echo "[run-all] $S already PASS — skipping"
    continue
  fi

  attempt=0
  passed=0
  while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt+1))
    log="scripts/logs/$S.attempt-$attempt.log"
    echo "[run-all] starting $S attempt $attempt @ $(date -Iseconds)"

    portable_timeout $PER_SESSION_TIMEOUT claude --print --dangerously-skip-permissions \
      < "prompts/$S.md" > "$log" 2>&1
    rc=$?

    if [ $rc -eq 124 ]; then
      echo "[run-all] $S timed out after ${PER_SESSION_TIMEOUT}s on attempt $attempt"
      continue
    fi

    if grep -qiE "rate.limit|429|too many requests|usage limit" "$log"; then
      echo "[run-all] $S rate-limited; backing off ${RATE_LIMIT_BACKOFF}s"
      sleep $RATE_LIMIT_BACKOFF
      continue
    fi

    if node scripts/verify.mjs "phase$phase_id" >>"$log" 2>&1; then
      echo "[run-all] $S PASS @ $(date -Iseconds)"
      passed=1
      [ $SUPERVISED -eq 1 ] && { read -r -p "[supervised] $S passed — enter to continue, Ctrl+C to stop"; }
      break
    fi
    echo "[run-all] $S verify FAILED on attempt $attempt (claude rc=$rc; see $log)"
  done

  if [ $passed -ne 1 ]; then
    echo "[run-all] $S exhausted retries. Inspect STATE.json + scripts/logs/. Re-run to resume."
    exit 1
  fi
done

echo "[run-all] BUILD COMPLETE — all phases PASS"
