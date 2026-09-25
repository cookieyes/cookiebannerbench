import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadRun, runIds } from "@/data/source";
import { DEFAULT_SLICE, detailHref, profileLabel, SITE_URL } from "@/lib/config";
import { formatDate, formatMetric } from "@/lib/metrics";
import { pageMetadata } from "@/lib/page-metadata";
import { installName, publishedTarget } from "@/lib/published";
import { availableSlices, buildRows, type Row } from "@/lib/ranking";
import { BAND_WORD, roundScore } from "@/lib/scoring";

export function detailData(app: string, profile: string = DEFAULT_SLICE.profile) {
  const entry = publishedTarget(app);
  if (!entry) notFound();
  const run = loadRun();
  const ids = runIds();
  const index = ids.indexOf(run.runId);
  const previous = index > 0 ? loadRun(ids[index - 1]) : undefined;
  if (!run.profiles.includes(profile)) notFound();
  const rows = buildRows(run, { ...DEFAULT_SLICE, profile }, previous);
  const row = rows.find((r) => r.app === app);
  if (!row) notFound();
  const control = rows.find((r) => r.control);
  // The same installation across every condition, for the conditions table.
  const conditions = availableSlices(run).map((s) => {
    const slice = { ...s, percentile: DEFAULT_SLICE.percentile };
    const all = buildRows(run, slice, previous);
    return { slice, row: all.find((r) => r.app === app) as Row, rows: all };
  });
  return { entry, run, rows, row, control, conditions, profile };
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The page's name: the installation and the test profile, and nothing that
 * moves between runs. Live figures go in the description and the body, so the
 * title a search result shows does not change every time the benchmark reruns.
 */
export function detailTitle(app: string, profile: string = DEFAULT_SLICE.profile) {
  const entry = publishedTarget(app);
  if (!entry) notFound();
  return {
    name: installName(entry),
    title: `${installName(entry)} Benchmark – ${titleCase(profileLabel(profile))}`,
  };
}

export function detailMetadata(app: string, profile: string = DEFAULT_SLICE.profile): Metadata {
  const { row, run } = detailData(app, profile);
  const { name, title } = detailTitle(app, profile);
  const path = detailHref(app, profile);
  const condition = `${profile} profile, run of ${formatDate(run.finishedAt)}, cold cache, p75`;
  const bytes = row.scores.categories.flatMap((c) => c.metrics).find((m) => m.id === "bytes");
  const description = row.control
    ? `The no-SDK control on the ${condition}: ${formatMetric(row.values.lcp ?? null, "ms")} LCP. Every installation's first paint, blocking, bytes and requests are scored as the increase over this page.`
    : `${name} on the ${condition}: ${
        row.scores.overall === null
          ? "not scored"
          : `${roundScore(row.scores.overall)}/100${row.scores.band ? ` ${BAND_WORD[row.scores.band]}` : ""}`
      }, ${formatMetric(row.values.bannerVisible ?? null, "ms")} to banner${
        bytes?.measured ? `, ${formatMetric(bytes.cost, "bytes")} added` : ""
      }. Score composition, every load, position in the field and the load timeline.`;
  return pageMetadata({
    title,
    description,
    path,
    image: { url: `${SITE_URL}/cmp/${app}/opengraph-image`, alt: `${name} benchmark result` },
  });
}
