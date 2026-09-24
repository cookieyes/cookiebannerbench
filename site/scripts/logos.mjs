/**
 * Normalise the provider marks to one optical size on the circular plate.
 *
 * Every mark is drawn on a fixed light plate (`.mark`), which is a circle. A
 * mark that bleeds to the edge of its square therefore loses its corners: the
 * CookieYes tick lost the square under it, c15t lost the outer nodes. The marks
 * fall into two kinds and each wants a different treatment:
 *
 *   - a tile, whose corners carry a brand colour (Enzuzo, Ketch). The colour is
 *     meant to fill the plate, so the circle rounding it off is the intended
 *     avatar. Left exactly as fetched.
 *   - a glyph, whose corners are transparent (CookieYes, c15t, iubenda) or
 *     white (OneTrust, Osano — a favicon drawn on a white square, which is a
 *     glyph too, not a white tile). Nothing may touch the circle, so the ink is
 *     cropped away from its background and re-centred at INSET of the box —
 *     inside the circle's inscribed square (≈70.7%) with room to spare, which
 *     also puts every glyph at the same optical weight. The background is
 *     dropped, so the plate's own colour shows in both themes.
 *
 * Idempotent: a glyph already inset is measured, re-cropped and re-placed at
 * the same size. Sources are in data/logo-sources.json; the files as fetched
 * are kept in data/logo-raw/ so this can always be re-run from the original.
 *
 *   node scripts/logos.mjs          # normalise public/logos from data/logo-raw
 *   node scripts/logos.mjs --seed   # first run: fill data/logo-raw from public/logos
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../../packages/harness/package.json", import.meta.url));
const { chromium } = require("playwright");

/**
 * Fraction of the box a glyph's longest side is scaled to. The circle's
 * inscribed square is 1/√2 ≈ 0.707, so 0.68 is as large as a square glyph can
 * be drawn with both diagonals still clear of the plate's edge.
 */
const INSET = 0.68;
/** Channel distance within which a pixel counts as the corner background. */
const TOLERANCE = 24;
/** Every mark is emitted at this size, whatever the vendor's own file is. */
const OUT = 64;

const out = resolve(import.meta.dirname, "../public/logos");
const raw = resolve(import.meta.dirname, "../data/logo-raw");
const seed = process.argv.includes("--seed");

if (seed) {
  mkdirSync(raw, { recursive: true });
  for (const f of readdirSync(out).filter((f) => f.endsWith(".png")))
    if (!existsSync(resolve(raw, f))) writeFileSync(resolve(raw, f), readFileSync(resolve(out, f)));
}
if (!existsSync(raw)) throw new Error("data/logo-raw is missing — run once with --seed");

const files = readdirSync(raw).filter((f) => f.endsWith(".png"));
const browser = await chromium.launch();
const page = await browser.newPage();
const results = await page.evaluate(
  async ({ items, inset, tolerance, out }) => {
    const done = [];
    for (const { name, data } of items) {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const size = out;
      const src = document.createElement("canvas");
      src.width = img.naturalWidth;
      src.height = img.naturalHeight;
      const sx = src.getContext("2d");
      sx.drawImage(img, 0, 0);
      const d = sx.getImageData(0, 0, src.width, src.height).data;
      const at = (x, y) => {
        const i = (y * src.width + x) * 4;
        return [d[i], d[i + 1], d[i + 2], d[i + 3]];
      };
      // What the mark sits on is whatever fills its corners. Transparent or
      // near-white means the square is padding; anything else is the brand.
      const inset2 = 2;
      const corners = [
        at(inset2, inset2),
        at(src.width - 1 - inset2, inset2),
        at(inset2, src.height - 1 - inset2),
        at(src.width - 1 - inset2, src.height - 1 - inset2),
      ];
      const clear = corners.every((c) => c[3] < 16);
      const white = corners.every((c) => c[3] > 240 && c[0] > 235 && c[1] > 235 && c[2] > 235);
      const isTile = !clear && !white;

      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      if (isTile) {
        x.drawImage(img, 0, 0, size, size);
        done.push({ name, kind: "tile", png: c.toDataURL("image/png") });
        continue;
      }
      // The ink is every pixel that is not the background. On a white square the
      // background is also painted out, so the plate's own colour shows through.
      let minX = src.width;
      let minY = src.height;
      let maxX = -1;
      let maxY = -1;
      const ink = sx.createImageData(src.width, src.height);
      for (let y = 0; y < src.height; y++)
        for (let px = 0; px < src.width; px++) {
          const i = (y * src.width + px) * 4;
          const a = d[i + 3];
          const isInk = white
            ? a > 16 &&
              (255 - d[i] > tolerance || 255 - d[i + 1] > tolerance || 255 - d[i + 2] > tolerance)
            : a > 16;
          if (!isInk) continue;
          ink.data[i] = d[i];
          ink.data[i + 1] = d[i + 1];
          ink.data[i + 2] = d[i + 2];
          ink.data[i + 3] = a;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      const cut = document.createElement("canvas");
      cut.width = src.width;
      cut.height = src.height;
      cut.getContext("2d").putImageData(ink, 0, 0);
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const scale = (size * inset) / Math.max(bw, bh);
      const w = bw * scale;
      const h = bh * scale;
      x.drawImage(cut, minX, minY, bw, bh, (size - w) / 2, (size - h) / 2, w, h);
      done.push({ name, kind: white ? "glyph/white" : "glyph", png: c.toDataURL("image/png") });
    }
    return done;
  },
  {
    items: files.map((name) => ({
      name,
      data: readFileSync(resolve(raw, name)).toString("base64"),
    })),
    inset: INSET,
    tolerance: TOLERANCE,
    out: OUT,
  },
);
await browser.close();

for (const r of results) {
  writeFileSync(resolve(out, r.name), Buffer.from(r.png.split(",")[1], "base64"));
  console.log(`${r.kind.padEnd(11)} ${r.name}`);
}
console.log(`\n${results.length} marks normalised into public/logos.`);
