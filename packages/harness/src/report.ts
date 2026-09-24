import { isSeparated } from "./stats.js";
import type { MetricKey, RunManifest, Summary } from "./types.js";

interface MetricFormat {
  label: string;
  format: (value: number) => string;
}

const FORMATS: Record<string, MetricFormat> = {
  fcp: { label: "FCP", format: (v) => `${Math.round(v)}ms` },
  lcp: { label: "LCP", format: (v) => `${Math.round(v)}ms` },
  tbt: { label: "TBT", format: (v) => `${Math.round(v)}ms` },
  tti: { label: "TTI", format: (v) => `${Math.round(v)}ms` },
  cls: { label: "CLS", format: (v) => v.toFixed(4) },
  transferBytes: { label: "Transfer", format: (v) => `${(v / 1024).toFixed(1)}KB` },
  bannerVisible: { label: "Banner", format: (v) => `${Math.round(v)}ms` },
  bannerLayoutShift: { label: "Banner CLS", format: (v) => v.toFixed(4) },
  bannerViewportCoverage: { label: "Coverage", format: (v) => `${(v * 100).toFixed(1)}%` },
};

const DEFAULT_COLUMNS: MetricKey[] = ["lcp", "tbt", "cls", "bannerVisible", "transferBytes"];

function formatValue(metric: MetricKey, value: number): string {
  return (FORMATS[metric] ?? { format: (v: number) => v.toFixed(2) }).format(value);
}

function labelFor(metric: MetricKey): string {
  return FORMATS[metric]?.label ?? metric;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const line = (cells: string[], align: "left" | "right"): string =>
    cells
      .map((cell, index) => {
        const width = widths[index] ?? cell.length;
        return index === 0 || align === "left" ? pad(cell, width) : padLeft(cell, width);
      })
      .join("  ");
  const divider = widths.map((width) => "-".repeat(width)).join("  ");
  return [line(headers, "left"), divider, ...rows.map((row) => line(row, "right"))].join("\n");
}

/** Renders one profile/cache slice of a run as a leaderboard, fastest first. */
export function formatRun(
  manifest: RunManifest,
  profile: string,
  cache: string,
  columns: MetricKey[] = DEFAULT_COLUMNS,
  percentile: "p50" | "p75" | "p95" = "p75",
): string {
  const rows: string[][] = [];
  for (const app of manifest.apps) {
    const metrics = manifest.summary[`${app.name}|${profile}|${cache}`];
    if (!metrics) {
      continue;
    }
    rows.push([
      app.label,
      ...columns.map((metric) => {
        const summary = metrics[metric];
        return summary ? formatValue(metric, summary[percentile].point) : "-";
      }),
    ]);
  }

  const sortColumn = columns[0];
  if (sortColumn) {
    rows.sort((a, b) => {
      const parse = (row: string[]): number => Number.parseFloat(row[1] ?? "") || 0;
      return parse(a) - parse(b);
    });
  }

  const header = `${manifest.runId}  ${profile} / ${cache}  ${percentile}  n=${manifest.iterations}`;
  return `${header}\n\n${renderTable(["App", ...columns.map(labelFor)], rows)}`;
}

export interface Regression {
  key: string;
  metric: MetricKey;
  base: number;
  head: number;
  deltaPercent: number;
  separated: boolean;
}

/**
 * Diffs two runs at a given percentile.
 *
 * `separated` is the part that matters: it is true only when the two bootstrap
 * confidence intervals do not overlap. A large delta with overlapping intervals
 * is noise that happens to look like a result.
 */
export function compare(
  base: Summary,
  head: Summary,
  percentile: "p50" | "p75" | "p95" = "p75",
): Regression[] {
  const regressions: Regression[] = [];
  for (const [key, headMetrics] of Object.entries(head)) {
    const baseMetrics = base[key];
    if (!baseMetrics) {
      continue;
    }
    for (const [metric, headSummary] of Object.entries(headMetrics) as [
      MetricKey,
      NonNullable<Summary[string][MetricKey]>,
    ][]) {
      const baseSummary = baseMetrics[metric];
      if (!baseSummary) {
        continue;
      }
      const from = baseSummary[percentile];
      const to = headSummary[percentile];
      regressions.push({
        key,
        metric,
        base: from.point,
        head: to.point,
        deltaPercent: from.point === 0 ? 0 : ((to.point - from.point) / from.point) * 100,
        separated: isSeparated(from, to),
      });
    }
  }
  return regressions.sort((a, b) => b.deltaPercent - a.deltaPercent);
}

/**
 * Below this many loads per slice, a bootstrap interval is narrow enough that
 * ordinary machine noise reads as a significant change. Gate on runs above it.
 */
export const MIN_RELIABLE_ITERATIONS = 20;

/** Formats a comparison, showing only differences the intervals can resolve. */
export function formatComparison(regressions: Regression[], thresholdPercent: number): string {
  const significant = regressions.filter(
    (regression) => regression.separated && Math.abs(regression.deltaPercent) >= thresholdPercent,
  );
  if (significant.length === 0) {
    return `No change beyond ${thresholdPercent}% with non-overlapping confidence intervals.`;
  }
  const rows = significant.map((regression) => [
    regression.key,
    labelFor(regression.metric),
    formatValue(regression.metric, regression.base),
    formatValue(regression.metric, regression.head),
    `${regression.deltaPercent > 0 ? "+" : ""}${regression.deltaPercent.toFixed(1)}%`,
  ]);
  return renderTable(["Slice", "Metric", "Base", "Head", "Delta"], rows);
}
