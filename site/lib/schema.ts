import { z } from "zod";

/**
 * Mirrors `packages/harness/src/types.ts`. Parsed at build time so schema drift
 * in the harness fails the build loudly instead of rendering `undefined` into a
 * published comparison table.
 */

const ci = z.object({
  point: z.number(),
  lower: z.number(),
  upper: z.number(),
});

const metricSummary = z.object({
  n: z.number().int().positive(),
  p50: ci,
  p75: ci,
  p95: ci,
});

/**
 * Metric keys exactly as the harness emits them. `bannerVisible` is absent from
 * a slice when no banner was detected — that absence is meaningful and must
 * never be coerced to 0, which would sort as the best possible result.
 */
export const METRIC_KEYS = [
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
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

const sliceSummary = z.object(
  Object.fromEntries(METRIC_KEYS.map((k) => [k, metricSummary.optional()])) as Record<
    MetricKey,
    z.ZodOptional<typeof metricSummary>
  >,
);

const runApp = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  version: z.string(),
});

export const runManifestSchema = z.object({
  runId: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  iterations: z.number().int().positive(),
  profiles: z.array(z.string().min(1)).nonempty(),
  apps: z.array(runApp).min(1),
  // Individual loads are not rendered; they are large and the summary is the
  // published surface. Kept out of the parsed shape to avoid holding 1,600
  // objects in the build's memory for every page.
  summary: z.record(z.string(), sliceSummary),
});

export const appConfigSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  vendor: z.string().min(1),
  bannerSelectors: z.array(z.string()),
  serviceHosts: z.array(z.string()),
  tags: z.array(z.string()),
});

export const targetSchema = z.object({
  url: z.string().url(),
  version: z.string(),
  deployedAt: z.string(),
});

export type RunManifest = z.infer<typeof runManifestSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
export type Target = z.infer<typeof targetSchema>;
export type MetricSummary = z.infer<typeof metricSummary>;
export type CI = z.infer<typeof ci>;
