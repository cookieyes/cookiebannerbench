import type { Unit } from "@/lib/metrics";
import type { CI, MetricKey } from "@/lib/schema";

/**
 * The score.
 *
 * Every scored measurement is a cost the page or the visitor actually pays,
 * mapped to 0–100 by one rule and combined by fixed weights:
 *
 *   points   = 100 × (1 − min(cost, anchor) / anchor)
 *   category = share-weighted mean of its measured subcategories
 *   overall  = weight-weighted mean of its measured categories
 *
 * Anchors, shares and weights are fixed here, printed beside every score, and
 * set before the run that uses them. Changing one is a method change.
 *
 * ── Method 2: four categories ──
 *
 * Every host-affected metric is the increase over the identical page with no
 * consent SDK; every measurement is linear and appears once; unmeasured is
 * never zero — the category renormalises and the score says provisional.
 * Bytes and requests are read off the wire over the DevTools protocol. Page
 * paint is measured as first paint; the page's own LCP (banner excluded) is
 * reported beside it. Hosts contacted is reported, not scored.
 *
 * A measurement is scored only if it is (a) observed, (b) a cost, (c) able to
 * vary on this fixture, and (d) not |r| > 0.9 with another scored measurement.
 * Everything that fails one of those is collected and reported, with the
 * reason, on /methodology — including LCP, TTI, CLS, p95 and third-party bytes.
 *
 * Method 1 remains computable, so a published score can always be reproduced
 * from its own run under its own rules.
 */

export type MethodVersion = 1 | 2;
export const CURRENT_METHOD: MethodVersion = 2;
/** The method the site publishes, under the name its pages use. */
export const METHOD_VERSION = CURRENT_METHOD;

/**
 * When the current anchors, shares and weights were fixed. Declared rather
 * than derived from a run, because "fixed before the run it scored" is the
 * claim the methodology page makes, and only a date recorded on purpose can
 * back it. Every published run under this method started after this moment.
 */
export const ANCHORS_FIXED = "2026-09-23T13:15:08.000Z";

/**
 * Category ids. Method 1 keeps its original ids so comparisons across old runs
 * stay joinable; method 2's are new because its categories are.
 */
export type CategoryId =
  | "banner"
  | "bytes"
  | "coverage"
  | "stability"
  | "speed"
  | "page"
  | "network"
  | "experience";

/** Measurement ids. One cost function per id, shared across every method. */
export type MetricId =
  | "banner"
  | "fcp"
  | "tbt"
  | "cls"
  | "bytes"
  | "requests"
  | "origins"
  | "coverage"
  | "inert";

/** One unit vocabulary for the whole site, so every cost formats the same way. */
export type ScoreUnit = Unit;

/** Every anchor, in its metric's own unit. The score's zero points. */
export const ANCHORS = {
  /** Time to banner, method 1. Clipped c15t, OneTrust and Ketch at 0 alike. */
  banner: 2500,
  /** Time to banner, method 2. Clears everything but the slowest install. */
  bannerV2: 5000,
  /**
   * First-paint delay. The Core Web Vitals "poor" FCP line, used as a delta
   * budget by the same rule already applied to TBT and CLS: a consent layer
   * that alone adds a "poor" page's worth of delay scores nothing.
   */
  fcp: 3000,
  /** Main-thread blocking added. The CWV "poor" TBT line. */
  tbt: 600,
  /** Layout shift added. The CWV "poor" CLS line. Scored in method 1, reported in method 2. */
  cls: 0.25,
  /** Wire bytes added. A judgement, unchanged since method 1. */
  bytes: 250 * 1024,
  /**
   * Requests added. A judgement: the control page makes six, so twenty more
   * is a consent layer that has more than quadrupled the page's request count.
   */
  requests: 20,
  /** Third-party hosts contacted. Reported, not scored — kept for the detail page. */
  origins: 5,
  /** Share of the first viewport. */
  coverage: 0.5,
  /**
   * Time the banner is visible but cannot be clicked. One second is where a
   * wait stops feeling like a response and starts interrupting the task
   * (Nielsen's 1.0 s limit); the probe floors a responsive banner at ~0.
   */
  inert: 1000,
} as const;

export interface MetricDef {
  id: MetricId;
  label: string;
  /** Weight within its category; a category's shares sum to one. */
  share: number;
  anchor: number;
  unit: ScoreUnit;
  /** How the cost is measured, in one line, for the page beside the number. */
  explain: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  weight: number;
  metrics: readonly MetricDef[];
  explain: string;
  /** Printed beside the score, so the reader sees the zero points. */
  ceiling: string;
}

const m = (
  id: MetricId,
  label: string,
  share: number,
  anchor: number,
  unit: ScoreUnit,
  explain: string,
): MetricDef => ({ id, label, share, anchor, unit, explain });

const ceilingOf = (metrics: readonly MetricDef[]) =>
  metrics.map((metric) => formatAnchor(metric.anchor, metric.unit)).join(" · ");

export function formatAnchor(anchor: number, unit: ScoreUnit): string {
  switch (unit) {
    case "ms":
      return anchor >= 1000 ? `${anchor / 1000} s` : `${anchor} ms`;
    case "bytes":
      return `${Math.round(anchor / 1024)} KB`;
    case "percent":
      return `${Math.round(anchor * 100)} %`;
    case "shift":
      return String(anchor);
    default:
      return String(anchor);
  }
}

const category = (
  id: CategoryId,
  label: string,
  weight: number,
  explain: string,
  metrics: MetricDef[],
): Category => ({ id, label, weight, explain, metrics, ceiling: ceilingOf(metrics) });

/* ── Method 2 ─────────────────────────────────────────────────────────────── */

export const CATEGORIES: readonly Category[] = [
  category("speed", "Banner Speed", 0.3, "How long a visitor waits to be asked.", [
    m(
      "banner",
      "Time to banner",
      1,
      ANCHORS.bannerV2,
      "ms",
      "From navigation start to the banner being painted and visible.",
    ),
  ]),
  category(
    "page",
    "Page Impact",
    0.25,
    "What the consent layer costs the host page's own rendering and responsiveness, beyond the identical page with no SDK.",
    [
      m(
        "fcp",
        "First-paint delay",
        0.5,
        ANCHORS.fcp,
        "ms",
        "How much later the page's first contentful paint arrives than on the no-SDK control.",
      ),
      m(
        "tbt",
        "Main-thread blocking",
        0.5,
        ANCHORS.tbt,
        "ms",
        "Total blocking time added beyond the control: long-task time over 50 ms, during which input cannot be handled.",
      ),
    ],
  ),
  category(
    "network",
    "Network Cost",
    0.25,
    "What the consent layer adds to the page's network load, read off the wire rather than from what the page is allowed to see.",
    [
      m(
        "bytes",
        "Bytes added",
        0.6,
        ANCHORS.bytes,
        "bytes",
        "Wire bytes beyond the no-SDK control, headers included, as the DevTools protocol recorded them.",
      ),
      m(
        "requests",
        "Requests added",
        0.4,
        ANCHORS.requests,
        "count",
        "Completed network requests beyond the control. Each is at least a round trip and a slot in the connection queue.",
      ),
    ],
  ),
  category(
    "experience",
    "Visitor Experience",
    0.2,
    "How the banner treats the person it is asking: how much of the page it hides, and whether it answers when tapped.",
    [
      m(
        "coverage",
        "Viewport coverage",
        0.6,
        ANCHORS.coverage,
        "percent",
        "Banner area as a share of the first viewport, measured when the banner is detected.",
      ),
      m(
        "inert",
        "Inert after appearing",
        0.4,
        ANCHORS.inert,
        "ms",
        "Time between the banner becoming visible and a control passing a hit test at its own centre. Each millisecond here is not also counted in Banner Speed.",
      ),
    ],
  ),
];

/* ── Method 1, in the same shape, for reproducing published scores ──────── */

const METHOD_1: readonly Category[] = [
  category("banner", "Time to banner", 0.3, "From navigation start to a visible banner.", [
    m("banner", "Time to banner", 1, ANCHORS.banner, "ms", "From navigation start."),
  ]),
  category("bytes", "Transferred bytes", 0.25, "Bytes beyond the no-SDK control.", [
    m("bytes", "Transferred bytes", 1, ANCHORS.bytes, "bytes", "Beyond the control."),
  ]),
  category("coverage", "Viewport coverage", 0.25, "Share of the first viewport.", [
    m("coverage", "Viewport coverage", 1, ANCHORS.coverage, "percent", "At detection."),
  ]),
  // Equal shares: method 1 averaged its two stability metrics.
  category("stability", "Page stability", 0.2, "Shift and blocking beyond the control.", [
    m("cls", "Layout shift", 0.5, ANCHORS.cls, "shift", "Beyond the control."),
    m("tbt", "Main-thread blocking", 0.5, ANCHORS.tbt, "ms", "Beyond the control."),
  ]),
];

export function categoriesFor(method: MethodVersion): readonly Category[] {
  return method === 2 ? CATEGORIES : METHOD_1;
}

/**
 * The method a run is scored under: the one in force when it started. A run
 * recorded before the current anchors were fixed keeps the method it was
 * recorded under, so a method change never rewrites an older run's score —
 * the promise the methodology page makes.
 */
export function methodForRun(startedAt: string): MethodVersion {
  return startedAt >= ANCHORS_FIXED ? CURRENT_METHOD : 1;
}

/** The scored parts under the current method, under the name the site imports. */
export const INPUTS = CATEGORIES;

export const BANDS = { good: 80, fair: 60 } as const;
export type Band = "good" | "fair" | "poor";
export const BAND_WORD: Record<Band, string> = { good: "Good", fair: "Fair", poor: "Poor" };
export const bandOf = (score: number): Band =>
  score >= BANDS.good ? "good" : score >= BANDS.fair ? "fair" : "poor";

const linear = (cost: number, anchor: number) =>
  100 * (1 - Math.min(Math.max(cost, 0), anchor) / anchor);

export interface MetricScore {
  id: MetricId;
  label: string;
  share: number;
  anchor: number;
  unit: ScoreUnit;
  /** 0–100, or null when this metric could not be measured. */
  score: number | null;
  /** The cost that produced the score, in the metric's own unit. */
  cost: number | null;
  measured: boolean;
  /** One line about how the number was arrived at, or why there is none. */
  note: string;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  weight: number;
  /** Share-weighted mean of the measured metrics, or null when none were. */
  score: number | null;
  metrics: MetricScore[];
  /** True when the category was scored over some but not all of its metrics. */
  partial: boolean;
  /** First metric's cost, for the places that show one number per category. */
  cost: number | null;
  /** Second metric's cost, where the category has two. */
  cost2: number | null;
  measured: boolean;
  note: string;
}

export interface Scores {
  method: MethodVersion;
  /** 0–100 over the measured categories, or null for the control / nothing measured. */
  overall: number | null;
  band: Band | null;
  /** True when the score covers less than the full weight, or a category is partial. */
  provisional: boolean;
  /** Share of category weight the overall was computed over, 0–1. */
  weightMeasured: number;
  categories: CategoryScore[];
  /** The same array under the name the site has always used for the scored parts. */
  inputs: CategoryScore[];
  /** Score implied by the lower and upper bounds of every interval. */
  spread: { low: number; high: number } | null;
}

type Values = Partial<Record<MetricKey, number>>;
type Intervals = Partial<Record<MetricKey, CI>>;

interface Cost {
  cost: number | null;
  note: string;
}

const NOT_COLLECTED = "Not collected in this run";

/** Every metric's cost, in its own unit, or null when it was not measured. */
function costs(values: Values, control: Values): Record<MetricId, Cost> {
  const banner = values.bannerVisible;
  const detected = banner !== undefined;
  const increase = (key: MetricKey) =>
    values[key] !== undefined && control[key] !== undefined
      ? Math.max(0, (values[key] ?? 0) - (control[key] ?? 0))
      : null;

  // Two byte accountings, in order of preference. The protocol's sees every
  // response; the page's own reports 0 for any cross-origin response whose
  // server withholds Timing-Allow-Origin — every CDN consent vendor — and is
  // kept only so runs recorded before the recorder existed still score.
  // Zero on either side means nothing was recorded, not that nothing moved.
  const wire = (key: "wireBytes" | "wireRequests") =>
    (values[key] ?? 0) > 0 && (control[key] ?? 0) > 0
      ? (values[key] ?? 0) - (control[key] ?? 0)
      : null;
  const wireDelta = wire("wireBytes");
  const pageDelta =
    values.transferBytes !== undefined && control.transferBytes !== undefined
      ? values.transferBytes - control.transferBytes
      : null;
  const delta = wireDelta ?? pageDelta;
  const deltaHidden =
    wireDelta === null &&
    delta !== null &&
    delta <= 0 &&
    (values.requestCount ?? 0) > (control.requestCount ?? 0) &&
    (values.thirdPartyBytes ?? 0) === 0;

  const requestDelta = wire("wireRequests") ?? increase("requestCount");

  // The inert window is the banner's own property, so it is unmeasured
  // whenever the banner or its first usable moment is.
  const inert =
    detected && values.bannerInteractive !== undefined
      ? Math.max(0, values.bannerInteractive - (banner ?? 0))
      : null;

  return {
    banner: {
      cost: banner ?? null,
      note: detected ? "From navigation start" : "Banner not detected",
    },
    fcp: { cost: increase("fcp"), note: "Beyond the no-SDK control" },
    tbt: { cost: increase("tbt"), note: "Beyond the no-SDK control" },
    cls: { cost: increase("cls"), note: "Beyond the no-SDK control" },
    bytes: {
      cost: deltaHidden ? null : delta,
      note: deltaHidden
        ? "Cross-origin sizes not exposed to the collector"
        : delta === null
          ? "No control on this condition"
          : wireDelta !== null
            ? "Beyond the no-SDK control, measured over the wire"
            : "Beyond the no-SDK control, as the page reported it",
    },
    requests: {
      cost: requestDelta === null ? null : Math.max(0, requestDelta),
      note: requestDelta === null ? NOT_COLLECTED : "Beyond the no-SDK control",
    },
    origins: {
      cost:
        values.wireThirdPartyOrigins === undefined
          ? null
          : Math.max(0, values.wireThirdPartyOrigins - (control.wireThirdPartyOrigins ?? 0)),
      note:
        values.wireThirdPartyOrigins === undefined ? NOT_COLLECTED : "Contacted during the load",
    },
    coverage: {
      cost: detected ? (values.bannerViewportCoverage ?? null) : null,
      note: detected ? "Of the first viewport, at detection" : "Banner not detected",
    },
    inert: {
      cost: inert,
      note: !detected
        ? "Banner not detected"
        : inert === null
          ? "No control became clickable within 5 s, or not collected"
          : "Visible to first clickable control",
    },
  };
}

function categoryScores(values: Values, control: Values, method: MethodVersion): CategoryScore[] {
  const cost = costs(values, control);
  return categoriesFor(method).map((cat) => {
    const metrics: MetricScore[] = cat.metrics.map((metric) => {
      const own = cost[metric.id];
      return {
        id: metric.id,
        label: metric.label,
        share: metric.share,
        anchor: metric.anchor,
        unit: metric.unit,
        score: own.cost === null ? null : linear(own.cost, metric.anchor),
        cost: own.cost,
        measured: own.cost !== null,
        note: own.note,
      };
    });
    const measured = metrics.filter((metric) => metric.score !== null);
    const shareMeasured = measured.reduce((sum, metric) => sum + metric.share, 0);
    return {
      id: cat.id,
      label: cat.label,
      weight: cat.weight,
      // Renormalised over the measured subcategories: a missing one is never
      // read as zero, and never as a hundred either.
      score: shareMeasured
        ? measured.reduce((sum, metric) => sum + (metric.score ?? 0) * metric.share, 0) /
          shareMeasured
        : null,
      metrics,
      cost: metrics[0]?.cost ?? null,
      cost2: metrics[1]?.cost ?? null,
      measured: measured.length > 0,
      note: metrics.find((metric) => !metric.measured)?.note ?? metrics[0]?.note ?? "",
      partial: measured.length > 0 && measured.length < metrics.length,
    };
  });
}

function combine(categories: CategoryScore[]) {
  const measured = categories.filter((c) => c.score !== null);
  const weightMeasured = measured.reduce((sum, c) => sum + c.weight, 0);
  if (!weightMeasured) return { overall: null, weightMeasured: 0 };
  return {
    overall: measured.reduce((sum, c) => sum + (c.score ?? 0) * c.weight, 0) / weightMeasured,
    weightMeasured,
  };
}

/** Round once, at the boundary the reader sees, and derive the band from the rounded number. */
export const roundScore = (score: number) => Math.round(score);

export function scoreInstallation(
  values: Values,
  intervals: Intervals,
  control: Values | undefined,
  isControl: boolean,
  method: MethodVersion = CURRENT_METHOD,
): Scores {
  const empty = (categories: CategoryScore[]): Scores => ({
    method,
    overall: null,
    band: null,
    provisional: false,
    weightMeasured: 0,
    categories,
    inputs: categories,
    spread: null,
  });
  if (isControl || !control) return empty([]);
  const categories = categoryScores(values, control, method);
  // No banner, no score. The score is the cost of a consent banner; a
  // condition in which none appeared has nothing to score, and a number
  // computed from the remaining categories would rank a page that showed no
  // banner above pages that did.
  const bannerMeasured = categories.some((c) =>
    c.metrics.some((metric) => metric.id === "banner" && metric.measured),
  );
  if (!bannerMeasured) return empty(categories);
  const { overall, weightMeasured } = combine(categories);
  // Every metric is a cost, so the score is monotone in each bound: the upper
  // bounds give the lowest score the intervals allow and vice versa. The one
  // exception is the inert window, a difference of two bounded values; moving
  // both to the same bound keeps it near its point estimate, so the spread is
  // slightly narrower than the true interval on Visitor Experience alone.
  const bound = (pick: (ci: CI) => number) => {
    const shifted: Values = { ...values };
    for (const key of Object.keys(intervals) as MetricKey[]) {
      const ci = intervals[key];
      if (ci) shifted[key] = pick(ci);
    }
    return combine(categoryScores(shifted, control, method)).overall;
  };
  const low = bound((ci) => ci.upper);
  const high = bound((ci) => ci.lower);
  return {
    method,
    overall,
    band: overall === null ? null : bandOf(roundScore(overall)),
    provisional:
      (weightMeasured > 0 && weightMeasured < 0.999) || categories.some((c) => c.partial),
    weightMeasured,
    categories,
    inputs: categories,
    spread: low === null || high === null ? null : { low, high },
  };
}

export const scoreText = (score: number | null | undefined) =>
  score == null ? "—" : String(roundScore(score));
