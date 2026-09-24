import { bootstrapCI } from "./stats.js";
import type { CacheState, Measurement, MetricKey, Summary } from "./types.js";

const SUMMARISED: MetricKey[] = [
  "fcp",
  "lcp",
  "cls",
  "tbt",
  "tti",
  "transferBytes",
  "requestCount",
  "thirdPartyBytes",
  "scriptLoadMs",
  "bannerVisible",
  "bannerInteractive",
  "bannerLayoutShift",
  "bannerViewportCoverage",
  "wireBytes",
  "wireRequests",
  "wireThirdPartyBytes",
  "wireVendorBytes",
  "wireVendorRequests",
  "wireThirdPartyOrigins",
  "wireThirdPartySetupMs",
  "contentLcp",
  "vendorBytes",
  "vendorRequests",
  "vendorConnectMs",
  "bytesScript",
  "bytesStyle",
  "bytesFont",
  "bytesImage",
  "bytesOther",
];

/**
 * The cache states a run records. Cold only: see `measureCold` for why the warm
 * load was removed. Runs recorded before that still carry warm slices, and
 * `summarise` groups by each measurement's own cache field rather than by this
 * list, so re-deriving an older run reproduces it exactly.
 */
export const CACHE_STATES: CacheState[] = ["cold"];

/**
 * Groups measurements by `<app>|<profile>|<cache>` and reports a bootstrapped
 * p50/p75/p95 for each metric.
 *
 * `bannerVisible` and `bannerInteractive` are null on loads where no banner
 * appeared, and those loads are dropped from those metrics only — a headless
 * SDK still has a valid LCP. A metric with no values left is omitted rather
 * than recorded as zero, so the site can tell unmeasured from free.
 */
export function summarise(measurements: readonly Measurement[]): Summary {
  const groups = new Map<string, Measurement[]>();
  for (const measurement of measurements) {
    const key = `${measurement.app}|${measurement.profile}|${measurement.cache}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(measurement);
    } else {
      groups.set(key, [measurement]);
    }
  }

  const summary: Summary = {};
  for (const [key, group] of groups) {
    const metrics: Summary[string] = {};
    for (const metric of SUMMARISED) {
      const values = group
        .map((measurement) => measurement[metric])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (values.length === 0) {
        continue;
      }
      metrics[metric] = {
        n: values.length,
        p50: bootstrapCI(values, 0.5),
        p75: bootstrapCI(values, 0.75),
        p95: bootstrapCI(values, 0.95),
      };
    }
    summary[key] = metrics;
  }
  return summary;
}
