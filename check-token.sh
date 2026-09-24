#!/usr/bin/env bash
# Verify the token works and show which account/teams it can reach.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${VERCEL_TOKEN:-}" ] && [ -f "$ROOT/.vercel-token" ]; then
  VERCEL_TOKEN="$(tr -d '[:space:]' < "$ROOT/.vercel-token")"
fi
[ -z "${VERCEL_TOKEN:-}" ] && { echo "No token found."; exit 1; }
export VERCEL_TOKEN
SCOPE="${SCOPE:-dev-cookieyescos-projects}"
echo "scope:   $SCOPE"
echo "account: $(vercel whoami --scope "$SCOPE" 2>&1 | tail -1)"
echo "teams:"
vercel teams ls 2>&1 | tail -n +2
