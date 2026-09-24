import type { MetricKey } from "@/lib/schema";

export type Percentile = "p50" | "p75" | "p95";
export type Unit = "ms" | "bytes" | "percent" | "shift" | "count" | "points";

export interface MetricMeta {
  key: MetricKey;
  /** Column heading. */
  label: string;
  /** Full name, for captions, tooltips and definitions. */
  description: string;
  /** One sentence shown on the column heading's definition. */
  define: string;
  unit: Unit;
  lowerIsBetter: boolean;
  /**
   * Whether the score uses this metric. "input" means one of the score's
   * measurements (as recorded, or as its increase over the control);
   * "reported" means collected and published, and never scored.
   */
  scored: "input" | "reported";
  /** For a scored metric, the category it counts toward. */
  category?: string;
}

/**
 * Metric definitions, taken from the harness. Labels and units are not
 * restated or reinterpreted here — a metric means what the harness measured.
 * The order is the order the methodology page lists them in: the score's
 * measurements category by category, then everything reported.
 */
export const METRICS: MetricMeta[] = [
  {
    key: "bannerVisible",
    label: "To banner",
    description: "Time to banner",
    define: "From navigation start until the consent banner was detected as visible.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "input",
    category: "Banner Speed",
  },
  {
    key: "fcp",
    label: "FCP",
    description: "First Contentful Paint",
    define:
      "When the page first painted. Scored as first-paint delay: how much later it arrived than on the no-SDK control.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "input",
    category: "Page Impact",
  },
  {
    key: "tbt",
    label: "TBT",
    description: "Total Blocking Time",
    define:
      "Main-thread time in long tasks beyond 50 ms each. Scored as the increase over the no-SDK control.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "input",
    category: "Page Impact",
  },
  {
    key: "wireBytes",
    label: "Bytes",
    description: "Bytes over the wire",
    define:
      "Every byte that crossed the network, recorded from outside the page, so a vendor that hides its sizes is still counted. Scored as the increase over the no-SDK control.",
    unit: "bytes",
    lowerIsBetter: true,
    scored: "input",
    category: "Network Cost",
  },
  {
    key: "wireRequests",
    label: "Requests",
    description: "Requests over the wire",
    define: "Completed network requests. Scored as the increase over the no-SDK control.",
    unit: "count",
    lowerIsBetter: true,
    scored: "input",
    category: "Network Cost",
  },
  {
    key: "bannerViewportCoverage",
    label: "Coverage",
    description: "Viewport coverage",
    define: "Share of the first viewport the banner's bounding box occupied when detected.",
    unit: "percent",
    lowerIsBetter: true,
    scored: "input",
    category: "Visitor Experience",
  },
  {
    key: "bannerInteractive",
    label: "To usable",
    description: "Time to a usable banner",
    define:
      "When a click on one of the banner's controls would first register. Scored as the wait after the banner appears.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "input",
    category: "Visitor Experience",
  },
  {
    key: "lcp",
    label: "LCP",
    description: "Largest Contentful Paint",
    define:
      "When the largest content element had rendered. Reported, not scored: when the banner is the largest thing on screen, a fast banner is a late LCP.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "contentLcp",
    label: "Page LCP",
    description: "The page's own LCP",
    define: "Largest Contentful Paint with the banner excluded. Reported, not scored.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "cls",
    label: "CLS",
    description: "Cumulative Layout Shift",
    define:
      "Total layout shift over the measured load, unitless. Reported, not scored: every banner here is a fixed overlay, so it barely varies.",
    unit: "shift",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "tti",
    label: "TTI",
    description: "Time to Interactive",
    define:
      "Approximated from the end of the last long task. Reported, not scored: it moves with blocking time, which is scored.",
    unit: "ms",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "wireThirdPartyOrigins",
    label: "Hosts",
    description: "Third-party hosts contacted",
    define:
      "Distinct hosts other than the page's own contacted during the load. Reported, not scored: its costs are already counted as time, bytes and requests.",
    unit: "count",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "wireThirdPartyBytes",
    label: "Third-party",
    description: "Third-party bytes",
    define:
      "Wire bytes from hosts other than the page's own. Reported, not scored: on this page it is the same money as bytes added.",
    unit: "bytes",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "transferBytes",
    label: "Page-reported",
    description: "Bytes the page could see",
    define:
      "Resource Timing's view of the same load, which reports zero for a cross-origin response that withholds Timing-Allow-Origin. Reported beside the wire figure; the difference is what was hidden.",
    unit: "bytes",
    lowerIsBetter: true,
    scored: "reported",
  },
  {
    key: "bannerLayoutShift",
    label: "Banner shift",
    description: "Layout shift after banner",
    define: "Layout shift accumulated after the banner was detected. Reported, not scored.",
    unit: "shift",
    lowerIsBetter: true,
    scored: "reported",
  },
];

export const METRIC_BY_KEY: Record<string, MetricMeta> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
);

/**
 * Number formatting is the design on a benchmark. One rule per quantity,
 * applied everywhere, with the unit returned separately so it can be set in
 * the secondary colour a gap away from the value. Decimals are never trimmed:
 * `0.0 %` keeps its zero so a column stays aligned on the decimal.
 */
export function parts(
  value: number | null | undefined,
  unit: Unit,
): { value: string; unit: string } {
  if (value === null || value === undefined || !Number.isFinite(value))
    return { value: "—", unit: "" };
  switch (unit) {
    case "ms":
      return value >= 1000
        ? { value: (value / 1000).toFixed(1), unit: "s" }
        : { value: String(Math.round(value)), unit: "ms" };
    case "bytes": {
      const abs = Math.abs(value);
      if (abs < 1024) return { value: String(Math.round(value)), unit: "B" };
      if (abs < 1024 * 1024) return { value: (value / 1024).toFixed(1), unit: "KB" };
      return { value: (value / 1024 / 1024).toFixed(1), unit: "MB" };
    }
    case "percent":
      return { value: (value * 100).toFixed(1), unit: "%" };
    case "shift":
      return { value: value.toFixed(3), unit: "" };
    case "count":
      return { value: value.toLocaleString("en").replace(/,/g, " "), unit: "" };
    case "points":
      return { value: String(Math.round(value)), unit: "pts" };
  }
}

/** Value and unit as one string, for prose, titles and text alternatives. */
export function formatMetric(value: number | null | undefined, unit: Unit): string {
  const p = parts(value, unit);
  return p.unit ? `${p.value} ${p.unit}` : p.value;
}

/** "12 Sep 2026", in UTC. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()];
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

/** Screen-reader text: the value with its unit spelled out. */
export function describeMetric(value: number | null | undefined, m: MetricMeta): string {
  if (value === null || value === undefined) return `${m.description}: not measured`;
  return `${m.description}: ${formatMetric(value, m.unit)}`;
}
