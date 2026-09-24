/**
 * Lighthouse over the served export, mobile emulation, median of N runs per
 * route, asserted against the thresholds in ../../lighthouserc.json.
 *
 *   node site/serve.mjs &            # serves out/ with gzip + cache headers
 *   node site/scripts/lighthouse.mjs # exits non-zero on any failed assertion
 *
 * Set CHROME_PATH to a Chrome/Chromium binary; by default the Playwright
 * Chromium installed for the harness is used.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../../packages/harness/package.json", import.meta.url));
const lighthouse = (await import(require.resolve("lighthouse"))).default;
// chrome-launcher is Lighthouse's own dependency, so resolve it from there.
const fromLighthouse = createRequire(require.resolve("lighthouse/package.json"));
const { launch } = await import(fromLighthouse.resolve("chrome-launcher"));
const { chromium } = require("playwright");

const config = JSON.parse(
  readFileSync(new URL("../../lighthouserc.json", import.meta.url), "utf8"),
);
const { url: urls, numberOfRuns, settings } = config.ci.collect;
const assertions = config.ci.assert.assertions;
const out = resolve(process.env.LH_OUTPUT ?? "/tmp/cbb-lighthouse");
mkdirSync(out, { recursive: true });

const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
const chrome = await launch({
  chromePath,
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const failures = [];
const rows = [];
try {
  for (const url of urls) {
    const runs = [];
    for (let i = 0; i < numberOfRuns; i++) {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "silent",
        ...settings,
      });
      runs.push(result.lhr);
    }
    const path = new URL(url).pathname;
    writeFileSync(
      resolve(out, `${path.replaceAll("/", "_") || "_"}.json`),
      JSON.stringify(runs.at(-1)),
    );
    const row = { path };
    for (const [key, [level, { minScore, maxNumericValue }]] of Object.entries(assertions)) {
      const value = key.startsWith("categories:")
        ? median(runs.map((r) => r.categories[key.slice("categories:".length)].score))
        : median(runs.map((r) => r.audits[key].numericValue));
      const label = key.replace("categories:", "");
      row[label] = key.startsWith("categories:") ? Math.round(value * 100) : Math.round(value);
      const ok = minScore !== undefined ? value >= minScore : value <= maxNumericValue;
      if (!ok) {
        const message = `${path} ${label}: ${row[label]} (limit ${minScore !== undefined ? minScore * 100 : maxNumericValue})`;
        if (level === "error") failures.push(message);
        else console.warn(`WARN ${message}`);
      }
    }
    rows.push(row);
    console.log(JSON.stringify(row));
  }
} finally {
  await chrome.kill();
}

writeFileSync(resolve(out, "summary.json"), JSON.stringify({ rows, failures }, null, 2));
assert.deepEqual(failures, [], `Lighthouse assertions failed:\n${failures.join("\n")}`);
console.log(`Lighthouse: ${rows.length} routes × ${numberOfRuns} runs, all assertions met.`);
