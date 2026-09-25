import type { MetadataRoute } from "next";
import { loadHistory, loadRun } from "@/data/source";
import { detailHref, LEGAL, SITE_URL } from "@/lib/config";
import { PUBLISHED } from "@/lib/published";
import { ANCHORS_FIXED } from "@/lib/scoring";
export const dynamic = "force-static";

/**
 * lastmod is when a page's content last changed, not when the site was built:
 * result pages change when a run is published, the methodology when the method
 * or the run it quotes changes, the privacy policy on its stated date. /about/
 * has no recorded edit date, so it carries none rather than a guessed one.
 * changefreq and priority are left out; search engines ignore them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const run = loadRun();
  const latest = (...dates: string[]) =>
    new Date(Math.max(...dates.map((d) => Date.parse(d)))).toISOString();
  const at = (path: string, lastModified?: string) => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    at("/", run.finishedAt),
    at("/methodology/", latest(ANCHORS_FIXED, run.finishedAt)),
    at("/about/"),
    at("/runs/", run.finishedAt),
    at("/privacy/", new Date(`${LEGAL.lastUpdated} UTC`).toISOString()),
    ...PUBLISHED.flatMap((p) =>
      run.profiles.map((profile) => at(detailHref(p.app, profile), run.finishedAt)),
    ),
    ...loadHistory().map((r) => at(`/runs/${r.id}/`, r.finishedAt)),
  ];
}
