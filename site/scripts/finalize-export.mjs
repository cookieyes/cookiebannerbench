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
  // The inlined stylesheet (~60 KB) is emitted at the top of <head>. Link-preview
  // bots such as Slack's read only the start of a page, so move it to the end of
  // <head>: the title, description and Open Graph tags then come first. It still
  // precedes <body>, so first paint is unchanged.
  const head = html.indexOf("</head>");
  const styles = [];
  const before = html.slice(0, head).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, (tag) => {
    styles.push(tag);
    return "";
  });
  html = before + styles.join("") + html.slice(head);
  writeFileSync(file, html);
  count++;
}
console.log(
  `Finalized ${count} static HTML files; native links and enhance.js only, no hydration runtime.`,
);
