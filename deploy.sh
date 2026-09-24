#!/usr/bin/env bash
# Deploy every benchmark app to Vercel as its own project.
#
# Project + subdomain convention:  cookiebannerbench-<app>.vercel.app
# Deploys run sequentially — Vercel rate-limits concurrent builds.
#
# Auth: reads VERCEL_TOKEN from the environment, or from ./.vercel-token
# (gitignored). The token is exported, never passed on the command line, so it
# does not show up in `ps` output, and it is never echoed.
#
#   ./deploy.sh                                    all apps
#   ./deploy.sh cookieyes-nextjs-no-critical-css   one or more
#   SCOPE=my-team ./deploy.sh                      deploy into a team
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REGION="${REGION:-iad1}"

if [ -z "${VERCEL_TOKEN:-}" ] && [ -f "$ROOT/.vercel-token" ]; then
  VERCEL_TOKEN="$(tr -d '[:space:]' < "$ROOT/.vercel-token")"
fi
if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "No token. Put one in $ROOT/.vercel-token or set VERCEL_TOKEN." >&2
  exit 1
fi
export VERCEL_TOKEN
SCOPE="${SCOPE:-dev-cookieyescos-projects}"

SCOPE_ARG=()
[ -n "${SCOPE:-}" ] && SCOPE_ARG=(--scope "$SCOPE")

# Fail early, and say what is actually wrong.
#
# When a token cannot reach a SAML-protected team, the CLI reports "The
# specified scope does not exist", which reads like a typo in SCOPE and is not
# one: the token is valid, its SSO session for the team has simply lapsed. The
# API says so plainly, so ask it before looping over every app.
if [ -n "${SCOPE:-}" ]; then
  probe=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v2/teams?slug=$SCOPE" --max-time 15 || true)
  case "$probe" in
    *'"saml":true'*|*"re-authenticate to this scope"*)
      echo "Token is valid, but its SSO session for '$SCOPE' has lapsed." >&2
      echo "Sign in to Vercel through SSO and issue a fresh token scoped to that team," >&2
      echo "then replace $ROOT/.vercel-token." >&2
      exit 1;;
    *'"error"'*)
      echo "Token cannot reach scope '$SCOPE':" >&2
      echo "$probe" | head -c 300 >&2
      echo >&2
      exit 1;;
  esac
fi

APPS=("$@")
if [ ${#APPS[@]} -eq 0 ]; then
  APPS=($(cd "$ROOT/apps" && ls -d */ | tr -d '/'))
fi

OUT="$ROOT/deployed-urls.txt"
: > "$OUT"

for app in "${APPS[@]}"; do
  project="cookiebannerbench-${app}"
  echo ""
  echo "──────── $app  →  $project ────────"
  cd "$ROOT/apps/$app"

  vercel link --project "$project" --yes ${SCOPE_ARG[@]+"${SCOPE_ARG[@]}"} >/dev/null
  # This CLI version prints progress *and* the deployment URL to stderr, so
  # capture both streams and pull the URL off the "Production" line.
  log="/tmp/vercel-$app.log"
  vercel deploy --prod --yes --regions "$REGION" ${SCOPE_ARG[@]+"${SCOPE_ARG[@]}"} \
    >"$log" 2>&1 || true
  url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' "$log" | head -1)

  # Vercel already assigns a stable production alias and repoints it on every
  # prod deploy, so there is nothing to claim by hand. Adding one manually is
  # worse than useless: a hand-added alias inherits Deployment Protection and
  # serves a login page, while the auto one stays public.
  #
  # The auto alias is truncated when the project name is long, and gets a random
  # suffix when the subdomain is already taken globally (that is where
  # "cookiebannerbench-baseline-henna" came from) — so read it, never guess it.
  alias_url=$(grep -oE '^.*Aliased[[:space:]]+https://[a-zA-Z0-9.-]+\.vercel\.app' "$log" \
              | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | head -1)
  [ -z "$alias_url" ] && alias_url="$url"

  if [[ "$alias_url" == https://* ]]; then
    echo "$app $alias_url" | tee -a "$OUT"
  else
    echo "$app FAILED — see $log" | tee -a "$OUT"
  fi
done

echo ""
echo "Wrote $OUT"
echo "Next: update targets.json, then run  cookiebannerbench preflight"
