import type { Percentile } from "@/lib/metrics";
import type { InstallModel } from "@/lib/published";
import { PUBLISHED } from "@/lib/published";
import type { CI, MetricKey, RunManifest } from "@/lib/schema";
import { methodForRun, roundScore, type Scores, scoreInstallation } from "@/lib/scoring";

export interface Slice {
  profile: string;
  cache: string;
  percentile: Percentile;
}

export interface Row {
  app: string;
  label: string;
  vendor: string;
  package: string | null;
  installModel: InstallModel;
  url: string;
  version: string;
  control: boolean;
  values: Partial<Record<MetricKey, number>>;
  intervals: Partial<Record<MetricKey, CI>>;
  /** Loads the run made in this condition (the LCP count, present for every load). */
  n: number | null;
  /** Loads in which the banner was detected; less than n is a partial run. */
  detected: number;
  /** Position by score, 1-based; null for the control and anything unscored. */
  rank: number | null;
  scores: Scores;
  /** Score delta against the previous run on the same condition, or null. */
  change: number | null;
}

export const sliceKey = (app: string, s: Slice) => `${app}|${s.profile}|${s.cache}`;

/**
 * The conditions a run actually recorded. Current runs are cold-only; runs
 * recorded before the warm load was removed also carry warm, and each run is
 * shown with exactly the conditions it measured.
 */
export function availableSlices(run: RunManifest) {
  const caches = [...new Set(Object.keys(run.summary).map((key) => key.split("|")[2] ?? ""))]
    .filter(Boolean)
    .sort();
  return run.profiles.flatMap((profile) => caches.map((cache) => ({ profile, cache })));
}

function baseRows(run: RunManifest, slice: Slice) {
  return PUBLISHED.flatMap((entry) => {
    const app = run.apps.find((a) => a.name === entry.app);
    if (!app) return [];
    const summary = run.summary[sliceKey(entry.app, slice)];
    const values: Row["values"] = {};
    const intervals: Row["intervals"] = {};
    for (const [key, metric] of Object.entries(summary ?? {}))
      if (metric) {
        values[key as MetricKey] = metric[slice.percentile].point;
        intervals[key as MetricKey] = metric[slice.percentile];
      }
    return [
      {
        app: entry.app,
        label: entry.displayName,
        vendor: entry.vendor,
        package: entry.package,
        installModel: entry.installModel,
        url: app.url,
        version: app.version,
        control: entry.installModel === "control",
        values,
        intervals,
        n: summary?.lcp?.n ?? summary?.bannerVisible?.n ?? null,
        detected: summary?.bannerVisible?.n ?? 0,
      },
    ];
  });
}

/**
 * Rows for one condition, scored against that condition's control, sorted by
 * score. The control sorts last and unranked; an unscored installation sorts
 * after every scored one — never as a zero.
 */
export function buildRows(run: RunManifest, slice: Slice, previous?: RunManifest): Row[] {
  const base = baseRows(run, slice);
  const control = base.find((r) => r.control);
  const method = methodForRun(run.startedAt);
  const scored = base.map((row) => ({
    ...row,
    scores: scoreInstallation(row.values, row.intervals, control?.values, row.control, method),
  }));
  // A change is only shown between two runs scored under the same method: a
  // difference across a method change would measure the method, not the provider.
  const before =
    previous && methodForRun(previous.startedAt) === method
      ? Object.fromEntries(
          buildRows(previous, slice).map((r) => [r.app, r.scores.overall] as const),
        )
      : {};
  // Ranked on the published, rounded score: two rows that print the same
  // number share a rank, on the leaderboard and on every detail page alike.
  const shown = (r: { scores: Scores }) =>
    r.scores.overall === null ? -1 : roundScore(r.scores.overall);
  const sorted = scored.sort(
    (a, b) =>
      Number(a.control) - Number(b.control) || shown(b) - shown(a) || a.app.localeCompare(b.app),
  );
  return sorted.map((row) => {
    const overall = row.scores.overall;
    const prior = before[row.app];
    return {
      ...row,
      rank:
        row.control || overall === null
          ? null
          : 1 + sorted.filter((o) => !o.control && shown(o) > shown(row)).length,
      change:
        overall !== null && prior !== null && prior !== undefined
          ? roundScore(overall) - roundScore(prior)
          : null,
    };
  });
}

export function overlaps(a: CI | undefined, b: CI | undefined) {
  return !!a && !!b && a.lower <= b.upper && b.lower <= a.upper;
}
