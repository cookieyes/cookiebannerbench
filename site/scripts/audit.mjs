import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const require = createRequire(new URL("../../packages/harness/package.json", import.meta.url));
const { chromium } = require("playwright");
const axe = readFileSync(require.resolve("axe-core"), "utf8");
const base = process.env.AUDIT_URL ?? "http://127.0.0.1:3100";
const out = resolve(process.env.AUDIT_OUTPUT ?? "/tmp/cbb-audit");
mkdirSync(out, { recursive: true });
const routes = [
  ...readFileSync(new URL("../out/sitemap.xml", import.meta.url), "utf8").matchAll(
    /<loc>(.*?)<\/loc>/g,
  ),
].map((m) => new URL(m[1]).pathname);
const selected =
  process.env.AUDIT_SMOKE === "1"
    ? [
        "/",
        "/cmp/cookieyes-nextjs/",
        "/cmp/c15t-react/",
        "/methodology/",
        "/about/",
        "/privacy/",
        "/runs/",
        "/runs/2026-09-14T11-13-42-177Z/",
      ]
    : routes;
const browser = await chromium.launch({ headless: true });
const report = { routes: [], interactions: {}, noJavaScript: [], errors: [] };
try {
  // Reduced motion so the 120 ms colour transitions never race axe's contrast sampling.
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(String(e)));
  for (const path of selected) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200, path);
    const canonical = await page.locator("link[rel=canonical]").getAttribute("href");
    assert.equal(canonical, `https://www.cookiebannerbench.com${path}`);
    assert.equal(await page.locator('script[src*="/_next/"]').count(), 0);
    const broken = await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      );
    assert.deepEqual(broken, [], path);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const json of ld) JSON.parse(json);
    for (const width of [1280, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole("button", {
            name: `${theme === "light" ? "Light" : "Dark"} theme`,
            exact: true,
          })
          .click();
        await page.addScriptTag({ content: axe });
        const result = await page.evaluate(
          async () =>
            await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
              },
            }),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        const violations = result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
        }));
        report.routes.push({ path, width, theme, overflow, violations });
        if (overflow || violations.length)
          console.log("FAIL", path, width, theme, JSON.stringify({ overflow, violations }));
      }
    console.log("AUDITED", path);
  }
  // Interaction correctness on the default condition, including keyboard and all controls.
  await page.goto(`${base}/`);
  await page.setViewportSize({ width: 1280, height: 900 });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const rows = () => page.locator("tbody tr");
  const first = () => rows().first().getAttribute("data-app");
  // Expectations come from the rows' own data, so the audit holds for any run.
  const values = async () =>
    page.locator("tbody tr").evaluateAll((trs) =>
      trs.map((tr) => ({
        app: tr.dataset.app,
        control: tr.dataset.control === "true",
        ...JSON.parse(tr.dataset.values),
      })),
    );
  const best = (list, key, dir) =>
    list
      .filter((r) => !r.control && r[key] != null)
      .sort(
        (a, b) =>
          (dir === "desc" ? b[key] - a[key] : a[key] - b[key]) || a.app.localeCompare(b.app),
      )[0]?.app;
  const data = await values();
  const total = data.length;
  assert.equal(await rows().count(), total);
  assert.equal(await first(), best(data, "score", "desc"), "ships sorted by score");
  assert.equal(await page.locator("th[data-metric=score]").getAttribute("aria-sort"), "descending");
  // Keyboard sort on LCP: ascending, lowest first. The no-SDK control is the
  // baseline the costs are measured against, not an entry, so it is not a row.
  await page.locator("[data-sort=lcp]").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("th[data-metric=lcp]").getAttribute("aria-sort"), "ascending");
  assert.equal(await first(), best(data, "lcp", "asc"));
  assert.equal(
    await rows()
      .filter({ has: page.locator("[data-control=true]") })
      .count(),
    0,
  );
  // A second press flips direction.
  await page.locator("[data-sort=lcp]").click();
  assert.equal(await page.locator("th[data-metric=lcp]").getAttribute("aria-sort"), "descending");
  // Unmeasured sorts last: Transferred ascending puts a measured row first and a dash row after the last measured one.
  await page.locator("[data-sort=extraBytes]").click();
  assert.equal(await first(), best(data, "extraBytes", "asc"));
  // Search, empty state, count in a live region.
  await page.locator("[name=query]").fill("cookieyes");
  const matches = data.filter((r) => r.app.includes("cookieyes")).length;
  assert.equal(await page.locator("tbody tr:visible").count(), matches);
  assert.match(
    await page.locator(".result-count").innerText(),
    new RegExp(`${matches} of ${total}`, "i"),
  );
  await page.locator("[name=query]").fill("no-match");
  assert.equal(await page.locator(".empty-state").isVisible(), true);
  await page.locator("[name=query]").fill("");
  // Every published column is shown; the acronyms carry a focusable (i) whose
  // tooltip spells the name out.
  await page.locator('.info[aria-describedby="tip-lcp"]').focus();
  assert.equal(await page.locator("#tip-lcp").isVisible(), true);
  assert.match(await page.locator("#tip-lcp .tip-title").innerText(), /Largest Contentful Paint/);
  // Header definitions appear on focus.
  await page.locator("[data-sort=score]").focus();
  assert.equal(await page.locator("th[data-metric=score] .tip").isVisible(), true);
  // Chart chiplets: every chart is points out of 100, and only one shows at a time.
  // The keys are the scoring method's category ids, so they are read off the
  // page rather than named here — a method change renames them.
  const chartKeys = await page
    .locator("[data-chart-tab]")
    .evaluateAll((tabs) => tabs.map((t) => t.dataset.chartTab));
  assert.equal(chartKeys[0], "score", "the overall score is the first chart");
  const [, firstInput, secondInput] = chartKeys;
  await page.locator(`[data-chart-tab=${firstInput}]`).click();
  assert.equal(await page.locator(`[data-chart="${firstInput}"]`).isVisible(), true);
  assert.equal(await page.locator('[data-chart="score"]').isVisible(), false);
  assert.equal(
    await page.locator(`[data-chart-tab=${firstInput}]`).getAttribute("aria-pressed"),
    "true",
  );
  // A chiplet is a real target at every pointer type.
  const chip = await page.locator(`[data-chart-tab=${secondInput}]`).boundingBox();
  assert.ok(chip.height >= 32, `chiplet height ${chip.height}`);
  assert.ok(chip.width >= 44, `chiplet width ${chip.width}`);
  await page.locator("[data-chart-tab=score]").click();
  // Condition fragments are fetched on demand; rapid changes must settle on the
  // last one selected, with focus kept. Which conditions exist is a property of
  // the run — a cold-only run has no warm option — so each target is the last
  // option the select actually offers rather than a name written here.
  const optionsOf = (name) =>
    page.locator(`[name=${name}]`).evaluate((s) => [...s.options].map((o) => o.value));
  const [profiles, percentiles] = await Promise.all([
    optionsOf("profile"),
    optionsOf("percentile"),
  ]);
  // Runs are cold-cache only, so there is no cache control to operate.
  const cache = await page
    .locator(".results-region")
    .first()
    .evaluate((r) => r.dataset.condition.split("|")[1]);
  const target = {
    profile: profiles.at(-1),
    cache,
    percentile: percentiles.at(-1),
  };
  const condition = `${target.profile}|${target.cache}|${target.percentile}`;
  await page.locator("[name=profile]").focus();
  await page.locator("[name=profile]").selectOption(target.profile);
  await page.locator("[name=percentile]").selectOption(target.percentile);
  await page.locator(`.results-region[data-condition="${condition}"]:not([aria-busy])`).waitFor();
  assert.equal(await rows().count(), total);
  assert.match(
    await page.evaluate(() => document.activeElement?.getAttribute("name") ?? "body"),
    /^(profile|percentile)$/,
    "focus must stay on the condition controls while a fragment loads",
  );
  // The sort resets to what the header says after a condition swap.
  assert.equal(await page.locator("th[data-metric=tbt]").isVisible(), true);
  const other = percentiles.find((p) => p !== target.percentile) ?? target.percentile;
  await page.locator("[name=percentile]").selectOption(other);
  await page
    .locator(
      `.results-region[data-condition="${target.profile}|${target.cache}|${other}"]:not([aria-busy])`,
    )
    .waitFor();
  await page.locator("[name=percentile]").selectOption(target.percentile);
  await page.locator(`.results-region[data-condition="${condition}"]:not([aria-busy])`).waitFor();
  await page.locator("[data-sort=score]").click();
  assert.equal(await page.locator("th[data-metric=score]").getAttribute("aria-sort"), "descending");
  // Row click navigates; the provider name is the real link.
  const href = await rows().first().locator(".identity a").getAttribute("href");
  await rows().first().locator("td").nth(2).click();
  await page.waitForURL(`**${href}`);
  await page.goBack();
  // Phone width: every column stays; the table scrolls inside its card, not the page.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const th of await page.locator("thead th[data-metric]").all())
    assert.equal(await th.isVisible(), true);
  assert.equal(await page.locator("tbody tr:visible").count(), total);
  assert.equal(
    await page.locator(".table-scroll").evaluate((e) => e.scrollWidth > e.clientWidth),
    true,
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  // Theme: explicit choice persists across a reload and yields to System.
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.getByRole("button", { name: "System theme", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), null);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  assert.equal(await page.locator("html").evaluate((e) => getComputedStyle(e).colorScheme), "dark");
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  assert.equal(
    await page.locator("html").evaluate((e) => getComputedStyle(e).colorScheme),
    "light",
  );
  report.interactions.correctness = "passed";
  await context.close();
  // No-JS cohort remains rendered and navigable at both widths.
  for (const width of [1280, 390]) {
    const nojs = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    });
    const p = await nojs.newPage();
    await p.goto(`${base}/`);
    const n = await p.locator("tbody tr").count();
    assert.ok(n >= 2, "rows rendered without JavaScript");
    assert.equal(await p.locator('[data-chart="score"] .bar').count(), n);
    // Whichever profile the leaderboard opens on, its link goes to that profile's page.
    await p.locator('tbody a[href^="/cmp/cookieyes-nextjs/"]').first().click();
    assert.match(await p.title(), /to banner|LCP/);
    report.noJavaScript.push({
      width,
      result: "server-rendered installations and working detail navigation",
    });
    await nojs.close();
  }
  const script = readFileSync(new URL("../out/enhance.js", import.meta.url));
  report.firstLoadJsGzipBytes = gzipSync(script).length;
  writeFileSync(resolve(out, "accessibility.json"), JSON.stringify(report, null, 2));
  const failures = report.routes.filter((r) => r.overflow || r.violations.length);
  console.log(
    JSON.stringify({
      views: report.routes.length,
      failures: failures.length,
      pageErrors: report.errors,
      firstLoadJsGzipBytes: report.firstLoadJsGzipBytes,
      noJavaScript: report.noJavaScript,
      interactions: report.interactions,
    }),
  );
  assert.equal(failures.length, 0);
  assert.equal(report.errors.length, 0);
} finally {
  writeFileSync(resolve(out, "accessibility.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
