import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRawRun, loadRun, runIds, validatePublication } from "@/data/source";
import { DEFAULT_SLICE } from "@/lib/config";
import { AWAITING_DEPLOYMENT, PUBLISHED, REMOVED } from "@/lib/published";
import { buildRows } from "@/lib/ranking";

describe("publication boundary", () => {
  it("has unique keys/packages, present in the current manifest", () => {
    const run = loadRawRun();
    // Counted from the list rather than asserted as a magic number, so adding
    // an installation is a one-line change here and not a puzzle.
    expect(new Set(PUBLISHED.map((p) => p.app)).size).toBe(PUBLISHED.length);
    expect(PUBLISHED.filter((p) => p.installModel === "control")).toHaveLength(1);
    const packages = PUBLISHED.flatMap((p) => (p.package ? [p.package] : []));
    expect(new Set(packages).size).toBe(packages.length);
    for (const p of PUBLISHED)
      expect(
        run.apps.some((a) => a.name === p.app) || AWAITING_DEPLOYMENT.includes(p.app),
        `${p.app} is published but absent from the run and not listed as awaiting deployment`,
      ).toBe(true);
    expect(() => validatePublication(run)).not.toThrow();
  });
  it("keeps a partial run rather than crashing: an absent target is not a row, an undetected banner is unmeasured", () => {
    const run = loadRawRun();
    // A published target missing from the manifest is simply not a row.
    const without = { ...run, apps: run.apps.filter((a) => a.name !== PUBLISHED[0]?.app) };
    expect(() => validatePublication(without)).not.toThrow();
    expect(buildRows(without, DEFAULT_SLICE).some((r) => r.app === PUBLISHED[0]?.app)).toBe(false);
    // A banner seen in fewer loads than the run made keeps its row; the count is recorded.
    const partial = structuredClone(run);
    const key = `cookieyes-nextjs|${DEFAULT_SLICE.profile}|${DEFAULT_SLICE.cache}`;
    const metric = partial.summary[key]?.bannerVisible;
    if (metric) metric.n = Math.max(1, run.iterations - 1);
    expect(() => validatePublication(partial)).not.toThrow();
    const row = buildRows(partial, DEFAULT_SLICE).find((r) => r.app === "cookieyes-nextjs");
    expect(row?.detected).toBe(Math.max(1, run.iterations - 1));
    // A banner never detected on a slice means no score at all — a dash, never a
    // number built from the inputs that remain, and coverage 0 never counts as 100.
    const none = structuredClone(run);
    delete none.summary[key]?.bannerVisible;
    const r = buildRows(none, DEFAULT_SLICE).find((x) => x.app === "cookieyes-nextjs");
    expect(r?.scores.overall).toBeNull();
    expect(r?.rank).toBeNull();
    const scored = (id: string) =>
      r?.scores.categories.flatMap((c) => c.metrics).find((m) => m.id === id);
    expect(scored("banner")?.measured).toBe(false);
    expect(scored("coverage")?.measured).toBe(false);
    // Only a corrupt manifest fails.
    const corrupt = structuredClone(run);
    delete corrupt.summary[key];
    expect(() => validatePublication(corrupt)).toThrow(/no .* summary/);
  });
  it("never exposes removed keys through the page data adapter, including history", () => {
    for (const id of runIds()) {
      const serialized = JSON.stringify(loadRun(id));
      for (const removed of REMOVED) expect(serialized).not.toContain(removed.app);
    }
  });
  it("keeps exclusion reasons in two explicit classes", () => {
    expect(new Set(REMOVED.map((r) => r.category))).toEqual(
      new Set(["invalid-banner-run", "internal-variant"]),
    );
  });
  it.runIf(process.env.CHECK_EXPORT === "1")(
    "scans every exported route and asset for forbidden names and legacy routes",
    () => {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
        );
      const files = walk("out");
      const forbidden = REMOVED.flatMap((r) => [r.app, ...r.aliases]);
      // A removed vendor is a term, not a substring. "Cookie Control" is a
      // product; "the site's cookie controls" is English, and the privacy
      // policy says it three times. Matching on word boundaries still catches
      // any real mention of the vendor while letting ordinary prose through —
      // a guard that cries wolf on its own copy gets switched off.
      const mention = (term: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const left = /^\w/.test(term) ? "\\b" : "";
        const right = /\w$/.test(term) ? "\\b" : "";
        return new RegExp(`${left}${escaped}${right}`);
      };
      for (const file of files) {
        for (const term of forbidden)
          expect(file.toLowerCase(), file).not.toMatch(mention(term.toLowerCase()));
        if (/\.(html|txt|xml|js|json|svg)$/.test(file)) {
          const text = readFileSync(file, "utf8").toLowerCase();
          for (const term of forbidden)
            expect(text, `${file}: ${term}`).not.toMatch(mention(term.toLowerCase()));
        }
      }
      for (const p of PUBLISHED) {
        expect(files).toContain(`out/cmp/${p.app}/index.html`);
        expect(files).toContain(`out/cmp/${p.app}/trace.json`);
      }
    },
  );
});
