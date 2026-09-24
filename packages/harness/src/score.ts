import type { Summary } from "./types.js";

/**
 * Category scoring, ported from the upstream `cookiebench` scorer so results
 * here line up with the numbers that project publishes.
 *
 * Two deliberate differences from upstream:
 *
 * 1. **A missing banner scores zero, not full marks.** Upstream signals failed
 *    detection with `null`, then does `cookieBannerTiming || 0`, which turns the
 *    penalty into `0ms` — the best possible banner time. An SDK that renders no
 *    banner therefore wins both banner metrics outright. Here an absent banner
 *    scores 0 on both and is labelled as such.
 *
 * 2. **Only the measured categories are scored.** Upstream's Bundle Strategy
 *    (25%) and Transparency (10%) come from fields a vendor writes in its own
 *    config — open-source flag, bundler name, company details — not from
 *    anything observed. They are reported separately rather than mixed in.
 */

/** Upstream's category weights. */
export const WEIGHTS = {
  performance: 0.4,
  bundleStrategy: 0.25,
  networkImpact: 0.2,
  transparency: 0.1,
  userExperience: 0.05,
} as const;

/**
 * Every npm SDK measured so far scores 100/100 on both declared categories,
 * because each one ticks the same boxes: open source, named company, disclosed
 * bundler, TypeScript. Holding them at 100 makes a total that is comparable
 * with upstream's while keeping the measured part honest.
 */
export const DECLARED_CATEGORY_SCORE = 100;

export interface ScoreDetail {
  name: string;
  value: string;
  score: number;
  maxScore: number;
  reason: string;
}

export interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  details: ScoreDetail[];
}

export interface Scorecard {
  app: string;
  profile: string;
  cache: string;
  /** Weighted total, holding the two declared categories at 100. */
  total: number;
  measured: CategoryScore[];
}

/** Picks the first threshold whose limit the value is at or under. */
function band(value: number, bands: [limit: number, score: number, reason: string][]): ScoreDetail {
  for (const [limit, score, reason] of bands) {
    if (value <= limit) {
      return { name: "", value: "", score, maxScore: 0, reason };
    }
  }
  const last = bands.at(-1);
  return { name: "", value: "", score: last ? last[1] : 0, maxScore: 0, reason: "Poor" };
}

function detail(name: string, value: string, maxScore: number, scored: ScoreDetail): ScoreDetail {
  return { name, value, score: scored.score, maxScore, reason: scored.reason };
}

const ms = (v: number): string => (v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`);
const kb = (v: number): string => `${(v / 1024).toFixed(1)}KB`;

function total(details: ScoreDetail[]): number {
  return details.reduce((sum, d) => sum + d.score, 0);
}

function performance(m: Record<string, number>): CategoryScore {
  const details = [
    detail(
      "First Contentful Paint",
      ms(m.fcp ?? 0),
      20,
      band(m.fcp ?? 0, [
        [50, 20, "Excellent"],
        [100, 18, "Very Good"],
        [200, 15, "Good"],
        [500, 10, "Fair"],
        [Infinity, 5, "Poor"],
      ]),
    ),
    detail(
      "Largest Contentful Paint",
      ms(m.lcp ?? 0),
      25,
      band(m.lcp ?? 0, [
        [100, 25, "Excellent"],
        [300, 20, "Very Good"],
        [500, 15, "Good"],
        [1000, 10, "Fair"],
        [Infinity, 5, "Poor"],
      ]),
    ),
    detail(
      "Cumulative Layout Shift",
      (m.cls ?? 0).toFixed(4),
      20,
      band(m.cls ?? 0, [
        [0.01, 20, "Excellent"],
        [0.05, 15, "Very Good"],
        [0.1, 10, "Good"],
        [0.25, 5, "Fair"],
        [Infinity, 0, "Poor"],
      ]),
    ),
    detail(
      "Time to Interactive",
      ms(m.tti ?? 0),
      20,
      band(m.tti ?? 0, [
        [1000, 20, "Excellent"],
        [1500, 15, "Very Good"],
        [2000, 10, "Good"],
        [3000, 5, "Fair"],
        [Infinity, 0, "Poor"],
      ]),
    ),
    detail(
      "Total Blocking Time",
      ms(m.tbt ?? 0),
      15,
      band(m.tbt ?? 0, [
        [50, 15, "Excellent"],
        [200, 10, "Good"],
        [500, 5, "Fair"],
        [Infinity, 0, "Poor"],
      ]),
    ),
  ];
  return {
    name: "Performance",
    score: total(details),
    maxScore: 100,
    weight: WEIGHTS.performance,
    details,
  };
}

function networkImpact(m: Record<string, number>): CategoryScore {
  const thirdPartyKb = (m.thirdPartyBytes ?? 0) / 1024;
  const details = [
    detail(
      "Total Bundle Size",
      kb(m.transferBytes ?? 0),
      35,
      band((m.transferBytes ?? 0) / 1024, [
        [50, 35, "Ultra lightweight"],
        [150, 30, "Lightweight"],
        [300, 20, "Moderate"],
        [Infinity, 10, "Heavy"],
      ]),
    ),
    detail(
      "Third-party Size",
      kb(m.thirdPartyBytes ?? 0),
      25,
      thirdPartyKb === 0
        ? { name: "", value: "", score: 25, maxScore: 25, reason: "Zero third-party" }
        : band(thirdPartyKb, [
            [50, 15, "Minimal third-party"],
            [100, 10, "Moderate third-party"],
            [Infinity, 5, "Heavy third-party"],
          ]),
    ),
    detail(
      "Network Requests",
      String(Math.round(m.requestCount ?? 0)),
      25,
      band(m.requestCount ?? 0, [
        [3, 25, "Minimal requests"],
        [5, 20, "Low requests"],
        [10, 15, "Moderate requests"],
        [15, 10, "Many requests"],
        [Infinity, 5, "Too many requests"],
      ]),
    ),
    detail(
      "Script Load Time",
      ms(m.scriptLoadMs ?? 0),
      15,
      band(m.scriptLoadMs ?? 0, [
        [50, 15, "Very fast loading"],
        [100, 10, "Fast loading"],
        [200, 5, "Moderate loading"],
        [Infinity, 0, "Slow loading"],
      ]),
    ),
  ];
  return {
    name: "Network Impact",
    score: total(details),
    maxScore: 100,
    weight: WEIGHTS.networkImpact,
    details,
  };
}

function userExperience(m: Record<string, number>, bannerRendered: boolean): CategoryScore {
  const details = [
    detail(
      "Layout Stability",
      (m.bannerLayoutShift ?? 0).toFixed(4),
      40,
      band(m.bannerLayoutShift ?? 0, [
        [0.01, 40, "No layout shifts"],
        [0.05, 30, "Minimal shifts"],
        [0.1, 20, "Minor shifts"],
        [0.25, 10, "Some shifts"],
        [Infinity, 0, "Significant shifts"],
      ]),
    ),
    // The upstream bug lives here: a banner that never rendered scores 0ms and
    // wins. An SDK that ships no banner has not earned a UX score at all.
    bannerRendered
      ? detail(
          "Banner Render Time",
          ms(m.bannerVisible ?? 0),
          35,
          band(m.bannerVisible ?? 0, [
            [25, 35, "Instant render"],
            [50, 25, "Very fast render"],
            [100, 15, "Fast render"],
            [200, 10, "Moderate render"],
            [Infinity, 5, "Slow render"],
          ]),
        )
      : {
          name: "Banner Render Time",
          value: "not detected",
          score: 0,
          maxScore: 35,
          reason: "No banner rendered",
        },
    bannerRendered
      ? detail(
          "Viewport Coverage",
          `${((m.bannerViewportCoverage ?? 0) * 100).toFixed(1)}%`,
          25,
          band((m.bannerViewportCoverage ?? 0) * 100, [
            [10, 25, "Minimal intrusion"],
            [20, 20, "Low intrusion"],
            [30, 15, "Moderate intrusion"],
            [50, 10, "High intrusion"],
            [Infinity, 5, "Very high intrusion"],
          ]),
        )
      : {
          name: "Viewport Coverage",
          value: "not detected",
          score: 0,
          maxScore: 25,
          reason: "No banner rendered",
        },
  ];
  return {
    name: "User Experience",
    score: total(details),
    maxScore: 100,
    weight: WEIGHTS.userExperience,
    details,
  };
}

/**
 * Scores one `<app>|<profile>|<cache>` slice at the given percentile.
 * Returns null when the run holds no data for that slice.
 */
export function scoreSlice(
  summary: Summary,
  key: string,
  percentile: "p50" | "p75" | "p95" = "p75",
): Scorecard | null {
  const metrics = summary[key];
  if (!metrics) {
    return null;
  }
  const [app = "", profile = "", cache = ""] = key.split("|");
  const values: Record<string, number> = {};
  for (const [name, s] of Object.entries(metrics)) {
    if (s) {
      values[name] = s[percentile].point;
    }
  }
  const bannerRendered = metrics.bannerVisible !== undefined;

  const measured = [
    performance(values),
    networkImpact(values),
    userExperience(values, bannerRendered),
  ];
  const weightedMeasured = measured.reduce((sum, c) => sum + c.score * c.weight, 0);
  const declared = (WEIGHTS.bundleStrategy + WEIGHTS.transparency) * DECLARED_CATEGORY_SCORE;

  return {
    app,
    profile,
    cache,
    total: Math.round(weightedMeasured + declared),
    measured,
  };
}

/** Scores every slice in a run that matches the given profile and cache state. */
export function scoreRun(
  summary: Summary,
  profile: string,
  cache: string,
  percentile: "p50" | "p75" | "p95" = "p75",
): Scorecard[] {
  return Object.keys(summary)
    .filter((k) => k.endsWith(`|${profile}|${cache}`))
    .map((k) => scoreSlice(summary, k, percentile))
    .filter((s): s is Scorecard => s !== null)
    .sort((a, b) => b.total - a.total);
}
