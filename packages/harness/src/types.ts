/** Metrics collected once per page load. All times are ms from navigation start. */
export interface Sample {
  /** First Contentful Paint. */
  fcp: number;
  /** Largest Contentful Paint. */
  lcp: number;
  /** Cumulative Layout Shift (unitless). */
  cls: number;
  /** Total Blocking Time: long-task time over 50ms between FCP and load. */
  tbt: number;
  /** Time To Interactive, approximated as the last long task before a 5s quiet window. */
  tti: number;
  /** Sum of transferSize over every resource, in bytes. */
  transferBytes: number;
  /** Number of resource requests the page made. */
  requestCount: number;
  /** Bytes transferred from hosts other than the page's own origin. */
  thirdPartyBytes: number;
  /** Total time spent loading scripts, in ms. */
  scriptLoadMs: number;
  /** When the consent banner became visible, or null when none was detected. */
  bannerVisible: number | null;
  /**
   * When the banner first became usable: some enabled control passes a hit test
   * at its own centre and is not mid-animation. Null when no banner appeared,
   * and null when no control became clickable within 5s of the banner
   * appearing — unmeasured, not zero.
   */
  bannerInteractive: number | null;
  /** Layout shift attributable to the banner appearing. */
  bannerLayoutShift: number;
  /** Fraction of the viewport the banner covers, 0-1. */
  bannerViewportCoverage: number;
  /** Bytes transferred from the vendor's own hosts, per the app's `serviceHosts`. */
  vendorBytes: number;
  /** Requests made to the vendor's own hosts. */
  vendorRequests: number;
  /** DNS lookup plus connection time spent on the vendor's hosts, in ms. */
  vendorConnectMs: number;
  /**
   * The protocol's byte accounting, recorded from outside the page.
   *
   * `transferBytes` above is the page's own view, which reports 0 for any
   * cross-origin response whose server withholds `Timing-Allow-Origin` — every
   * CDN consent vendor. These are the bytes that actually crossed the wire,
   * headers included, for every request regardless of origin.
   */
  wireBytes: number;
  wireRequests: number;
  /** Wire bytes from origins other than the page's own. */
  wireThirdPartyBytes: number;
  /** Wire bytes from the vendor's own hosts, per the app's `serviceHosts`. */
  wireVendorBytes: number;
  wireVendorRequests: number;
  /** Distinct third-party hosts contacted — each one received the visitor's IP. */
  wireThirdPartyOrigins: number;
  /** DNS + connection + TLS setup on those hosts, summed across connections. */
  wireThirdPartySetupMs: number;
  /**
   * The page's own largest contentful paint, excluding the banner. Raw `lcp`
   * charges a fast banner for being large; this is the cost the host pays.
   */
  contentLcp: number;
  /** Bytes by resource kind, so a Weight score can be explained rather than restated. */
  bytesScript: number;
  bytesStyle: number;
  bytesFont: number;
  bytesImage: number;
  bytesOther: number;
}

/**
 * Every key that is summarised across loads. `bannerVisible` and
 * `bannerInteractive` are nullable per load — a load where no banner appeared
 * contributes nothing to them — but both are real metrics, so the summariser
 * drops the null loads rather than the metric.
 */
export type MetricKey = keyof Sample;

export type CacheState = "cold" | "warm";

/** One measured page load, tagged with the conditions it ran under. */
export interface Measurement extends Sample {
  app: string;
  profile: string;
  cache: CacheState;
  iteration: number;
  at: string;
}

/** A per-app benchmark target, read from the app's `consentbench.json`. */
export interface AppConfig {
  /** Directory name under `apps/`, and the key used in `targets.json`. */
  name: string;
  /** Human-readable label for reports. */
  label: string;
  /** Vendor being measured, for grouping. */
  vendor: string;
  /** CSS selectors that identify the consent banner. First match wins. */
  bannerSelectors: string[];
  /** Third-party hosts this vendor loads from, for network attribution. */
  serviceHosts: string[];
  /** Free-form tags, e.g. `matched`, `cdn`, `headless`. */
  tags: string[];
}

/** Where a given app is deployed. */
export interface Target {
  url: string;
  /** Commit or package version the deployment was built from. */
  version: string;
  deployedAt: string;
}

export type TargetMap = Record<string, Target>;

export interface CI {
  point: number;
  lower: number;
  upper: number;
}

export interface MetricSummary {
  n: number;
  p50: CI;
  p75: CI;
  p95: CI;
}

/** Summaries keyed by `<app>|<profile>|<cache>`, then by metric. */
export type Summary = Record<string, Partial<Record<MetricKey, MetricSummary>>>;

/** One app-iteration that could not be measured, kept so a gap can be explained. */
export interface RunFailure {
  app: string;
  profile: string;
  iteration: number;
  at: string;
  reason: string;
}

export interface RunManifest {
  runId: string;
  startedAt: string;
  finishedAt: string;
  iterations: number;
  profiles: string[];
  apps: { name: string; label: string; url: string; version: string }[];
  /** False while the grid is still running, or if it stopped early. */
  complete?: boolean;
  /** Present only when at least one app-iteration failed. */
  failures?: RunFailure[];
  measurements: Measurement[];
  summary: Summary;
}
