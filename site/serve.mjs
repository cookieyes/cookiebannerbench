/**
 * Static server for auditing the export.
 *
 * `python -m http.server` sends no compression and no cache headers, which
 * inflates LCP and fails the caching audits — no real host behaves that way.
 * This mirrors what a CDN does: gzip, immutable hashed assets, revalidated HTML.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const ROOT = new URL("./out/", import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 3100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".xml", ".txt", ".json"]);

createServer((req, res) => {
  const url = (req.url ?? "/").split("?")[0];
  let file = join(ROOT, normalize(decodeURIComponent(url)).replace(/^(\.\.[/\\])+/, ""));
  // Clean URLs, as a CDN serves them: /a/b and /a/b/ both resolve to a/b.html.
  const bare = file.replace(/[/\\]+$/, "");
  if (existsSync(`${bare}.html`)) file = `${bare}.html`;
  else if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = extname(file);
  const headers = { "content-type": TYPES[ext] ?? "application/octet-stream" };
  // Hashed build assets never change; HTML must revalidate so a new run is seen.
  headers["cache-control"] = url.startsWith("/_next/static/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";
  headers["x-content-type-options"] = "nosniff";

  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  if (gzip) headers["content-encoding"] = "gzip";
  headers.vary = "accept-encoding";
  res.writeHead(200, headers);
  const stream = createReadStream(file);
  if (gzip) stream.pipe(createGzip()).pipe(res);
  else stream.pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`serving out/ on http://127.0.0.1:${PORT}`));
