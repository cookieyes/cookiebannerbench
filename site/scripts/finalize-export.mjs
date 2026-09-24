import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// All interactions are progressive enhancements in public/enhance.js. Remove
// unused App Router hydration from this deliberately fully-static export.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

let count = 0;
for (const file of walk("out").filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(file, "utf8");
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (tag) =>
    /src="\/_next\//.test(tag) || tag.includes("self.__next_f") ? "" : tag,
  );
  html = html.replace(/<link\b[^>]*>/g, (tag) =>
    /as="script"/.test(tag) && tag.includes("/_next/") ? "" : tag,
  );
  writeFileSync(file, html);
  count++;
}
console.log(
  `Finalized ${count} static HTML files; native links and enhance.js only, no hydration runtime.`,
);
