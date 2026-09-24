import { loadRun } from "@/data/source";
import { DISCLOSURE, detailHref, GITHUB_URL, SITE_NAME, SITE_URL } from "@/lib/config";
import { MODEL_LABEL } from "@/lib/models";
import { PUBLISHED } from "@/lib/published";

// Required by `output: "export"` — this route is generated at build time.
export const dynamic = "force-static";

/**
 * llms.txt (llmstxt.org): what the site is and where its pages are, for AI
 * tools. Every link is to a page's Markdown twin (see scripts/markdown-export.mjs),
 * which is also what `Accept: text/markdown` returns for the page itself.
 */
export function GET() {
  const run = loadRun();
  const md = (path: string) => `${SITE_URL}${path}index.md`;
  const providers = PUBLISHED.filter((p) => p.installModel !== "control").map((p) => {
    const name = `${p.displayName} · ${p.package ?? MODEL_LABEL[p.installModel]}`;
    const pages = run.profiles
      .map((profile) => `[${profile}](${md(detailHref(p.app, profile))})`)
      .join(", ");
    return `- ${name}: ${pages}`;
  });
  const body = [
    `# ${SITE_NAME}`,
    "",
    "> An open, reproducible benchmark of what consent banners cost the pages they sit on:",
    "> banner speed, page impact, network cost and visitor experience, measured on identical",
    "> pages against a no-SDK control and scored 0–100 against published anchors.",
    "",
    DISCLOSURE,
    "",
    `The current run is ${run.runId}: ${run.iterations} cold-cache loads per installation on each`,
    `test profile (${run.profiles.join(", ")}). Every page is also available as Markdown:`,
    "add `index.md` to its URL, or send `Accept: text/markdown` to the page itself.",
    "",
    "## Start here",
    "",
    `- [Leaderboard](${md("/")}): every installation ranked, with its score and measurements`,
    `- [How we test](${md("/methodology/")}): the run, the score formula and anchors, what is published and the known limits`,
    `- [Run history](${md("/runs/")}): every published run`,
    `- [About](${md("/about/")}): who publishes the benchmark and why`,
    "",
    "## Installations",
    "",
    "One detail page per installation and test profile: score composition, every load and the load timeline.",
    "",
    ...providers,
    "",
    "## Optional",
    "",
    `- [Source code and raw results](${GITHUB_URL}): the harness, the test apps and every run's data under results/`,
    `- [Privacy](${md("/privacy/")})`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
