/**
 * Build a self-contained copy of an exported page, for handing to someone who
 * has no checkout: fonts, logos, the icon and enhance.js are embedded as data
 * URIs so the file renders correctly from disk, and a <base> pointing at the
 * deployment keeps the navigation and the on-demand condition fragments working
 * for anyone who is online.
 *
 *   node scripts/standalone.mjs <route> <out-file> [base-url]
 *   node scripts/standalone.mjs / /tmp/leaderboard.html https://example.vercel.app
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [route = "/", outFile, baseUrl] = process.argv.slice(2);
if (!outFile) throw new Error("usage: standalone.mjs <route> <out-file> [base-url]");

const root = resolve(import.meta.dirname, "../out");
const read = (p) => readFileSync(resolve(root, p.replace(/^\//, "").split("?")[0]));
const TYPES = {
  woff2: "font/woff2",
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  webp: "image/webp",
};
const dataUri = (p) => {
  const ext = p.split("?")[0].split(".").pop();
  const type = TYPES[ext];
  if (!type) throw new Error(`no media type for ${p}`);
  return `data:${type};base64,${read(p).toString("base64")}`;
};

const file = route.endsWith("/") ? `${route}index.html` : `${route}/index.html`;
let html = readFileSync(resolve(root, file.replace(/^\//, "")), "utf8");
const embedded = new Set();

// Fonts, referenced from @font-face inside the inlined stylesheet.
html = html.replace(/url\((\/_next\/static\/media\/[^)]+?)\)/g, (_m, p) => {
  embedded.add(p);
  return `url(${dataUri(p)})`;
});

// Provider marks, and the favicon.
html = html.replace(/(<img[^>]*\ssrc=")(\/logos\/[^"]+)(")/g, (_m, a, p, b) => {
  embedded.add(p);
  return a + dataUri(p) + b;
});
html = html.replace(/(<link rel="icon" href=")([^"]+)(")/, (_m, a, p, b) => {
  embedded.add(p);
  return a + dataUri(p) + b;
});

// Preloads for things that are now inline would only fetch them a second time.
html = html.replace(/<link rel="preload"[^>]*(?:as="font"|as="image")[^>]*>/g, "");

// The enhancement script, so sorting, search, the theme toggle and the column
// picker all work with no server at all.
const enhance = readFileSync(resolve(root, "enhance.js"), "utf8");
html = html.replace(
  /<script src="\/enhance\.js"[^>]*><\/script>/,
  () => `<script>\n${enhance}\n</script>`,
);

// Root-relative links resolve against the base, so navigation and the condition
// fragments reach the deployment instead of the local filesystem.
if (baseUrl) html = html.replace(/<head>/, `<head><base href="${baseUrl}"/>`);

writeFileSync(outFile, html);
console.log(
  JSON.stringify({
    route,
    outFile,
    kb: Math.round(html.length / 1024),
    embedded: [...embedded].length,
    base: baseUrl ?? null,
    externalRefsLeft: [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]),
  }),
);
