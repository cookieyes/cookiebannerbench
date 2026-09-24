import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse } from "node-html-parser";

/**
 * A Markdown twin for every exported page, for agents that ask for
 * `Accept: text/markdown` (vercel.json rewrites those requests to it). Only
 * <main> is converted: the header, footer and theme controls are chrome.
 * Decoration an assistive reader would also skip is dropped first: anything
 * aria-hidden, inline SVG, scripts, header tooltips, and the buttons and form
 * controls, which mean nothing outside a browser.
 */
const DROP = [
  "script",
  "style",
  "svg",
  "noscript",
  "button",
  "select",
  "input",
  "label",
  "[aria-hidden='true']",
  "[hidden]",
  // Header tooltips and "select to sort" repeat what the methodology says once.
  ".tip",
  "th .sr-only",
];
const nhm = new NodeHtmlMarkdown({ bulletMarker: "-", maxConsecutiveNewlines: 2 });

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

let count = 0;
for (const file of walk("out").filter((f) => f.endsWith("index.html"))) {
  const doc = parse(readFileSync(file, "utf8"));
  const main = doc.querySelector("main");
  if (!main) continue;
  for (const node of main.querySelectorAll(DROP.filter((d) => d !== "button").join(",")))
    node.remove();
  // A sortable header's label lives in its button: keep the words, lose the control.
  for (const button of main.querySelectorAll("th button")) button.replaceWith(button.text);
  for (const button of main.querySelectorAll("button")) button.remove();
  // "97" and its unit are one value; the page sets the unit apart with CSS.
  for (const unit of main.querySelectorAll(".u")) unit.insertAdjacentHTML("beforebegin", " ");
  for (const slug of main.querySelectorAll(".slug")) slug.insertAdjacentHTML("beforebegin", " · ");
  // Inline pieces (value and unit, name and package, score and band) are
  // separated by CSS in the page; give them a space so they do not run together.
  for (const span of main.querySelectorAll("span")) span.insertAdjacentHTML("afterend", " ");
  const title = doc.querySelector("title")?.text.trim();
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const body = nhm.translate(main.innerHTML).trim();
  const head = [title ? `# ${title}` : null, canonical ? `Source: ${canonical}` : null]
    .filter(Boolean)
    .join("\n\n");
  writeFileSync(file.replace(/index\.html$/, "index.md"), `${head}\n\n${body}\n`);
  count++;
}
console.log(`Wrote ${count} Markdown pages beside their HTML.`);
