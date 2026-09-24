#!/usr/bin/env bash
# Run one full sweep: preflight, measure, report, upload.
#
#   ITERATIONS=100 S3_BUCKET=my-bucket scripts/run-benchmark.sh
#   ITERATIONS=20 scripts/run-benchmark.sh            # quick check, no upload
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ITERATIONS="${ITERATIONS:-100}"
CLI="node packages/harness/dist/index.js"

echo "==> preflight"
# A stale selector or an unlicensed domain fails silently during a sweep: the
# harness records "no banner" and the run still completes. Catch it in 60s
# rather than after 14 hours. Two targets are known-bad vendor-account issues,
# so a non-zero exit here is reported but not fatal.
$CLI preflight || echo "   (some targets unusable — see above before trusting their numbers)"

echo ""
echo "==> sweep: $ITERATIONS iterations x 2 profiles x cold/warm"
$CLI run --iterations "$ITERATIONS"

RUN_ID="$(ls -1 results | sort | tail -1)"
echo ""
echo "==> leaderboards"
for profile in fast-desktop throttled-mobile; do
  for cache in cold warm; do
    echo ""; echo "--- $profile / $cache ---"
    $CLI score "$RUN_ID" --profile "$profile" --cache "$cache" --percentile p75 || true
  done
done

if [ -n "${S3_BUCKET:-}" ]; then
  echo ""
  echo "==> upload to s3://$S3_BUCKET/$RUN_ID/"
  aws s3 cp "results/$RUN_ID/" "s3://$S3_BUCKET/$RUN_ID/" --recursive
fi

echo ""
echo "Done. Run id: $RUN_ID"
