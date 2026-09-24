import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadRun, runIds } from "@/data/source";
import { DEFAULT_SLICE, detailHref, SITE_URL } from "@/lib/config";
import { formatMetric } from "@/lib/metrics";
import { publishedTarget } from "@/lib/published";
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

export function detailMetadata(app: string, profile: string = DEFAULT_SLICE.profile): Metadata {
  const { row, run } = detailData(app, profile);
  const path = detailHref(app, profile);
  const title = row.control
    ? `Baseline, no consent SDK — ${formatMetric(row.values.lcp ?? null, "ms")} LCP`
    : `${row.label}${row.package ? ` ${row.package}` : ""} — ${roundScore(row.scores.overall ?? 0)} ${
        row.scores.band ? BAND_WORD[row.scores.band] : ""
      }, ${formatMetric(row.values.bannerVisible ?? null, "ms")} to banner`;
  const description = `${title}. Run ${run.runId}, ${profile.replace("-", " ")}, cold cache, p75. Score composition, every load, position in the field and the load timeline.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      images: [
        {
          url: `${SITE_URL}/cmp/${app}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${row.label} benchmark result`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/cmp/${app}/opengraph-image`],
    },
  };
}
