/**
 * Score a recorded run under both methods and print the comparison.
 *
 * Two jobs in one pass, because they answer different questions:
 *
 *  1. The regression gate. Method 1 computed by the new category code must
 *     reproduce the published method-1 score for every installation, exactly.
 *     The refactor moved four inputs into four categories; if that alone moves
 *     a score, the refactor is wrong and no comparison below means anything.
 *
 *  2. The comparison. Method 2 against method 1 on the same measurements, with
 *     the raw values of the newly scored metrics beside each delta, so the
 *     anchors can be judged against real numbers rather than asserted.
 *
 * No browser, no network: this reads results/<run>/run.json and nothing else.
 *
 *   node scripts/compare-methods.mjs [run-id] [--slice throttled-mobile|cold|p75]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const sliceArg = args.includes("--slice")
  ? args[args.indexOf("--slice") + 1]
  : "throttled-mobile|cold|p75";
const [profile, cache, percentile] = sliceArg.split("|");
const runId = args.find((a) => !a.startsWith("--") && a !== sliceArg);

const root = resolve(import.meta.dirname, "..");
const resultsDir = resolve(root, "../results");
const chosen =
  runId ??
  readdirSync(resultsDir)
    .filter((name) => /^\d{4}-/.test(name))
    .sort()
    .at(-1);
const run = JSON.parse(readFileSync(resolve(resultsDir, chosen, "run.json"), "utf8"));
/**
 * The method-1 scores one specific run published, read off the built site.
 *
 * The gate is a claim about the *code* — that moving four inputs into four
 * categories did not move a score — so it only means anything when recomputed
 * on the very run those scores came from. Pointed at any other run it would
 * compare two different sets of measurements and report the difference between
 * them as a regression, which is how a green gate becomes a meaningless one.
 */
const FIXTURE = JSON.parse(
  readFileSync(resolve(root, "__fixtures__/method1-published-scores.json"), "utf8"),
);
const GATE = FIXTURE.run === chosen && FIXTURE.slice === sliceArg ? FIXTURE.scores : {};
const GATE_SKIPPED = Object.keys(GATE).length === 0;

// The scoring model and the publication policy are TypeScript; bundle them so
// this script uses the same code the site does rather than a copy of it.
const { scoreInstallation, roundScore, PUBLISHED } = await load();

async function load() {
  const store = resolve(root, "../node_modules/.pnpm");
  const dir = readdirSync(store).find((name) => name.startsWith("rolldown@"));
  if (!dir) throw new Error("no bundler in node_modules/.pnpm — run pnpm install");
  const { rolldown } = await import(
    pathToFileURL(resolve(store, dir, "node_modules/rolldown/dist/index.mjs")).href
  );
  const entry = resolve(root, ".compare-entry.ts");
  writeFileSync(
    entry,
    `export { scoreInstallation, roundScore } from "./lib/scoring.ts";\nexport { PUBLISHED } from "./lib/published.ts";\n`,
  );
  const bundle = await rolldown({
    input: entry,
    external: [/^node:/],
    resolve: { alias: { "@": resolve(root) } },
    logLevel: "silent",
  });
  const { output } = await bundle.generate({ format: "esm" });
  return import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString("base64")}`);
}

const key = (app) => `${app}|${profile}|${cache}`;
const valuesOf = (app) => {
  const slice = run.summary[key(app)];
  if (!slice) return null;
  return Object.fromEntries(
    Object.entries(slice).map(([metric, summary]) => [metric, summary[percentile].point]),
  );
};
const intervalsOf = (app) => {
  const slice = run.summary[key(app)] ?? {};
  return Object.fromEntries(
    Object.entries(slice).map(([metric, summary]) => [metric, summary[percentile]]),
  );
};

const control = PUBLISHED.find((t) => t.installModel === "control");
const controlValues = control ? valuesOf(control.app) : null;

const rows = [];
for (const target of PUBLISHED) {
  if (target.installModel === "control") continue;
  const values = valuesOf(target.app);
  if (!values || !controlValues) continue;
  const v1 = scoreInstallation(values, intervalsOf(target.app), controlValues, false, 1);
  const v2 = scoreInstallation(values, intervalsOf(target.app), controlValues, false, 2);
  const published = GATE[target.app] ?? null;
  rows.push({
    app: target.app,
    label: `${target.displayName}${target.package ? ` ${target.package}` : ""}`,
    v1: v1.overall === null ? null : roundScore(v1.overall),
    v2: v2.overall === null ? null : roundScore(v2.overall),

    published,
    v1Provisional: v1.provisional,
    v2Provisional: v2.provisional,
    categories: v2.categories.map((c) => ({
      id: c.id,
      label: c.label,
      weight: c.weight,
      score: c.score === null ? null : Math.round(c.score),
      partial: c.partial,
      metrics: c.metrics.map((m) => ({
        id: m.id,
        score: m.score === null ? null : Math.round(m.score),
        cost: m.cost,
        share: m.share,
        anchor: m.anchor,
        unit: m.unit,
        measured: m.measured,
        note: m.note,
      })),
    })),
    // The raw values behind the two newly scored metrics, for judging anchors.
    raw: {
      bannerVisible: values.bannerVisible ?? null,
      bannerInteractive: values.bannerInteractive ?? null,
      gapToUsable:
        values.bannerInteractive !== undefined && values.bannerVisible !== undefined
          ? Math.round(values.bannerInteractive - values.bannerVisible)
          : null,
      bannerLayoutShift: values.bannerLayoutShift ?? null,
      vendorBytes: values.vendorBytes ?? null,
      vendorRequests: values.vendorRequests ?? null,
    },
  });
}

rows.sort((a, b) => (b.v2 ?? -1) - (a.v2 ?? -1));

// ── The gate ──────────────────────────────────────────────────────────────────
// Method 1 recomputed by the category code must equal the scores this run
// actually published, installation by installation. The refactor moved four
// inputs into four categories and nothing else; a single moved score means it
// changed the model rather than its shape, and every comparison below would be
// measuring the refactor instead of the method.
const drift = rows.filter((r) => r.published !== null && r.published !== r.v1);
const covered = rows.filter((r) => r.published !== null).length;
const v1MetricCount = rows[0]?.categories.length ?? 0;

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s ?? "—").padStart(n);
const lines = [];
lines.push(`run ${chosen}   slice ${profile} · ${cache} · ${percentile}   loads ${run.iterations}`);
lines.push("");
lines.push(
  `${pad("installation", 34)}${num("v1", 5)}${num("v2", 5)}${num("Δ", 6)}  ${pad("to banner", 11)}${pad("to usable", 11)}${pad("gap", 8)}${pad("banner shift", 13)}prov`,
);
lines.push("-".repeat(112));
for (const r of rows) {
  const delta = r.v1 !== null && r.v2 !== null ? r.v2 - r.v1 : null;
  lines.push(
    pad(r.label, 34) +
      num(r.v1, 5) +
      num(r.v2, 5) +
      num(delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`, 6) +
      "  " +
      pad(r.raw.bannerVisible === null ? "—" : `${Math.round(r.raw.bannerVisible)} ms`, 11) +
      pad(
        r.raw.bannerInteractive === null ? "—" : `${Math.round(r.raw.bannerInteractive)} ms`,
        11,
      ) +
      pad(r.raw.gapToUsable === null ? "—" : `${r.raw.gapToUsable} ms`, 8) +
      pad(r.raw.bannerLayoutShift === null ? "—" : r.raw.bannerLayoutShift.toFixed(3), 13) +
      (r.v2Provisional ? "yes" : ""),
  );
}
lines.push("");
lines.push("Category scores under method 2 (points out of 100):");
lines.push("");
const cats = rows[0]?.categories.map((c) => c.label) ?? [];
lines.push(`${pad("installation", 34)}${cats.map((c) => num(c, 15)).join("")}   partial`);
lines.push("-".repeat(112));
for (const r of rows) {
  lines.push(
    pad(r.label, 34) +
      r.categories.map((c) => num(c.score, 15)).join("") +
      "   " +
      r.categories
        .filter((c) => c.partial)
        .map((c) => c.label)
        .join(", "),
  );
}
lines.push("");
lines.push(
  GATE_SKIPPED
    ? `gate: not applicable — the fixture holds run ${FIXTURE.run} (${FIXTURE.slice}), this is ${chosen} (${sliceArg})`
    : drift.length === 0
      ? `gate: method 1 reproduced exactly on ${covered} of ${rows.length} installations; ${v1MetricCount} categories`
      : `gate FAILED — ${drift.length} scores drifted: ${drift.map((r) => `${r.app} published ${r.published} recomputed ${r.v1}`).join("; ")}`,
);
if (drift.length) process.exitCode = 1;

console.log(lines.join("\n"));
writeFileSync(
  resolve(root, "../method-comparison.json"),
  `${JSON.stringify({ run: chosen, slice: sliceArg, rows }, null, 2)}\n`,
);
