/**
 * Recompute a recorded run's summary from its own per-load measurements.
 *
 * The raw measurements have always carried every field the collector produced,
 * including ones the summariser used to drop (`bannerInteractive`). Promoting a
 * metric therefore does not need a new run — it needs the summariser applied
 * again to data already on disk. Nothing here touches a browser or a network,
 * so the measurements are the same measurements; only the derived percentiles
 * are rebuilt.
 *
 * Metrics the collector did not record at the time (vendor attribution, the
 * byte split) stay absent rather than being filled with zeroes.
 *
 *   node scripts/resummarise.mjs <run-id> [--write]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The harness is TypeScript with `.js` specifiers, which Node cannot strip on
// its own, so the one function this needs is bundled with the rolldown that
// vitest already brings in. No new dependency, and `summarise` stays the single
// implementation rather than being copied into this script — a second copy of
// the percentile code is exactly how a re-derivation turns into a re-definition.
const { summarise } = await loadSummarise();

async function loadSummarise() {
  // Found in the pnpm store rather than imported by name: this is a workspace,
  // so vitest's bundler is not hoisted where this script could resolve it.
  const store = resolve(import.meta.dirname, "../node_modules/.pnpm");
  const dir = readdirSync(store).find((name) => name.startsWith("rolldown@"));
  if (!dir) throw new Error("no bundler in node_modules/.pnpm — run pnpm install");
  const { rolldown } = await import(
    pathToFileURL(resolve(store, dir, "node_modules/rolldown/dist/index.mjs")).href
  );
  const bundle = await rolldown({
    input: resolve(import.meta.dirname, "../packages/harness/src/summarise.ts"),
    external: [/^node:/],
    logLevel: "silent",
  });
  const { output } = await bundle.generate({ format: "esm" });
  // `summarise` is pure and imports nothing but node builtins, so the bundle
  // loads straight from memory with no temp file and no browser dependency.
  return import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString("base64")}`);
}

const [runId, ...flags] = process.argv.slice(2);
if (!runId) throw new Error("usage: resummarise.mjs <run-id> [--write]");
const path = resolve(import.meta.dirname, `../results/${runId}/run.json`);
const run = JSON.parse(readFileSync(path, "utf8"));

const before = run.summary;
const after = summarise(run.measurements);

const keysOf = (summary) => {
  const keys = new Set();
  for (const slice of Object.values(summary)) for (const key of Object.keys(slice)) keys.add(key);
  return keys;
};
const was = keysOf(before);
const now = keysOf(after);
const added = [...now].filter((k) => !was.has(k));
const lost = [...was].filter((k) => !now.has(k));

// Every metric that existed before must come back identical: this script is a
// re-derivation, not a re-measurement, and a moved percentile would mean the
// summariser changed behaviour rather than gained a field.
const drift = [];
for (const [slice, metrics] of Object.entries(before))
  for (const [key, value] of Object.entries(metrics)) {
    const fresh = after[slice]?.[key];
    if (!fresh || JSON.stringify(fresh) !== JSON.stringify(value)) drift.push(`${slice}/${key}`);
  }

console.log(
  JSON.stringify(
    {
      runId,
      slices: Object.keys(after).length,
      metricsBefore: was.size,
      metricsAfter: now.size,
      added,
      lost,
      driftedExistingMetrics: drift.length,
      wrote: flags.includes("--write") && drift.length === 0,
    },
    null,
    2,
  ),
);

if (drift.length) {
  console.error(`REFUSING TO WRITE: ${drift.length} existing metrics changed, e.g. ${drift[0]}`);
  process.exit(1);
}
if (flags.includes("--write")) {
  run.summary = after;
  writeFileSync(path, `${JSON.stringify(run)}\n`);
}
