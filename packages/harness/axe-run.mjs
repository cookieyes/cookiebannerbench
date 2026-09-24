/** axe-core over the built export, every audited route, both colour schemes. */
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const axe = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const PAGES = [["/", "/"], ["/cmp/onetrust", "/cmp/onetrust/"], ["/cmp/cookieyes-nextjs", "/cmp/cookieyes-nextjs/"],
               ["/methodology", "/methodology/"], ["/about", "/about/"]];
const b = await chromium.launch({ headless: true });
let total = 0;
for (const scheme of ["light", "dark"]) {
  for (const [name, path] of PAGES) {
    const ctx = await b.newContext({ colorScheme: scheme });
    const p = await ctx.newPage();
    const res = await p.goto(BASE + path, { waitUntil: "load" });
    if (res?.status() !== 200) {
      throw new Error(`${path} returned ${res?.status()} — auditing a 404 would report phantom violations`);
    }
    await p.evaluate(axe);
    const r = await p.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
    total += r.violations.length;
    if (r.violations.length) {
      console.log(`  ${scheme} ${name}: ${r.violations.length}`);
      for (const v of r.violations) console.log(`     [${v.impact}] ${v.id}`);
    }
    await ctx.close();
  }
}
await b.close();
console.log(total === 0 ? "axe: 0 violations across every audited page and scheme" : `axe: ${total} violations`);
process.exit(total > 0 ? 1 : 0);
