import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";

// The site's CookieYes banner (@cookieyes/vanilla) and its stylesheet, written
// next to the export. Only on builds with analytics; the layout references
// neither file otherwise.
if (process.env.ENABLE_ANALYTICS === "true") {
  await build({
    entryPoints: ["consent/entry.ts"],
    outfile: "out/consent.js",
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    legalComments: "none",
    // Drops the SDK's development-only code (devtools hooks, extra checks).
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const require = createRequire(import.meta.url);
  copyFileSync(require.resolve("@cookieyes/vanilla/styles.css"), "out/consent.css");
  console.log("Built out/consent.js and out/consent.css.");
}
