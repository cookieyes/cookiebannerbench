import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cache } from "react";
import { z } from "zod";
import { PUBLISHED, publishedTarget } from "@/lib/published";
import {
  type AppConfig,
  appConfigSchema,
  type RunManifest,
  runManifestSchema,
  type Target,
  targetSchema,
} from "@/lib/schema";
import { methodForRun } from "@/lib/scoring";

// All benchmark filesystem reads are confined to this build-time adapter.
const REPO = existsSync(resolve(process.cwd(), "results"))
  ? process.cwd()
  : resolve(process.cwd(), "..");
const read = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
/**
 * Every run that finished. The harness checkpoints `run.json` after each
 * iteration with `complete: false`, so a directory can hold a run that is
 * still going, or one that died half way — and the newest directory is the one
 * the site publishes. A partial run is kept on disk for inspection and never
 * published; runs from before the checkpointing have no flag and finished.
 */
export const runIds = cache(() =>
  readdirSync(join(REPO, "results"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((id) => {
      const file = join(REPO, "results", id, "run.json");
      if (!existsSync(file)) return false;
      try {
        return (read(file) as { complete?: boolean }).complete !== false;
      } catch {
        return false;
      }
    })
    .sort(),
);
/**
 * The run the site publishes: the newest directory under results/, unless
 * PUBLISHED_RUN names one. A quick smoke run lands in results/ like any other,
 * so pinning is the way to keep the leaderboard on a full run while one is
 * being checked. The run history always lists every directory.
 */
export const publishedRunId = () => {
  const ids = runIds();
  const pinned = process.env.PUBLISHED_RUN;
  if (pinned && !ids.includes(pinned))
    throw new Error(`PUBLISHED_RUN ${pinned} is not in results/`);
  return pinned ?? ids.at(-1);
};
/**
 * Metrics whose collector changed meaning, and the first run recorded under the
 * new meaning. Older runs carry a value under the same key that measured
 * something else, and a score must never read it as the new thing.
 *
 * `bannerInteractive` before the hit-testing probe only checked that a control
 * existed, so it reported the same millisecond as `bannerVisible` for every
 * installation — an inert window of zero, which would score a perfect 100.
 */
export const COLLECTOR_CHANGES: readonly { metric: string; validFrom: string; reason: string }[] = [
  {
    metric: "bannerInteractive",
    validFrom: "2026-09-18T14-35-00-012Z",
    reason: "Recorded before the probe hit-tested controls; it could not see an inert banner.",
  },
];

/** Removes, from an older run, every metric recorded before its collector meant what it means now. */
export function withoutSupersededMetrics(run: RunManifest, id: string): RunManifest {
  const stale = COLLECTOR_CHANGES.filter((change) => id < change.validFrom).map((c) => c.metric);
  if (stale.length === 0) return run;
  return {
    ...run,
    summary: Object.fromEntries(
      Object.entries(run.summary).map(([slice, metrics]) => [
        slice,
        Object.fromEntries(Object.entries(metrics).filter(([metric]) => !stale.includes(metric))),
      ]),
    ) as RunManifest["summary"],
  };
}

export function loadRawRun(id = publishedRunId()): RunManifest {
  if (!id || !runIds().includes(id)) throw new Error("Unknown benchmark run");
  return withoutSupersededMetrics(
    runManifestSchema.parse(read(join(REPO, "results", id, "run.json"))),
    id,
  );
}
/**
 * What a manifest must satisfy to be rendered at all. Deliberately little: a
 * published target that is absent from a run is simply not a row in that run,
 * and a banner detected in fewer loads than the run made keeps its row with
 * the unmeasured inputs shown as such — a partial run propagates, it does not
 * crash the build or vanish. Only a corrupt manifest fails.
 */
/**
 * The cache conditions a run actually recorded, read off its own summary keys.
 *
 * Runs made before the warm load was removed carry two; every run from then on
 * carries one. Hardcoding the pair here would reject every current run, and
 * hardcoding "cold" would stop noticing a missing warm slice in an older one,
 * so the run says which conditions it claims and is then held to all of them.
 */
export function cacheStatesIn(run: RunManifest): string[] {
  const states = new Set<string>();
  for (const key of Object.keys(run.summary)) {
    const state = key.split("|")[2];
    if (state) states.add(state);
  }
  return [...states];
}
export function validatePublication(run: RunManifest) {
  const keys = new Set(run.apps.map((a) => a.name));
  if (keys.size !== run.apps.length) throw new Error("Duplicate app in manifest");
  for (const app of run.apps)
    for (const profile of run.profiles)
      for (const state of cacheStatesIn(run))
        if (!run.summary[`${app.name}|${profile}|${state}`])
          throw new Error(`Manifest lists ${app.name} but has no ${profile}/${state} summary`);
}
/** Published targets whose banner was detected in fewer loads than the run made, per slice. */
export function partialDetections(run: RunManifest) {
  const out: { app: string; profile: string; cache: string; detected: number }[] = [];
  for (const entry of PUBLISHED) {
    if (entry.installModel === "control") continue;
    for (const profile of run.profiles)
      for (const cache of cacheStatesIn(run)) {
        const summary = run.summary[`${entry.app}|${profile}|${cache}`];
        if (!summary) continue;
        const detected = summary.bannerVisible?.n ?? 0;
        if (detected < run.iterations) out.push({ app: entry.app, profile, cache, detected });
      }
  }
  return out;
}
export const loadRun = cache((id?: string): RunManifest => {
  const raw = loadRawRun(id);
  validatePublication(raw);
  return {
    ...raw,
    apps: raw.apps.filter((a) => publishedTarget(a.name)),
    summary: Object.fromEntries(
      Object.entries(raw.summary).filter(([key]) => publishedTarget(key.split("|")[0] ?? "")),
    ),
  };
});
export const loadHistory = cache(() =>
  runIds()
    .map((id) => {
      const run = loadRawRun(id);
      return {
        id,
        date: run.startedAt.slice(0, 10),
        targets: run.apps.length,
        published: run.apps.filter((a) => publishedTarget(a.name)).length,
        iterations: run.iterations,
        finishedAt: run.finishedAt,
        method: methodForRun(run.startedAt),
      };
    })
    .reverse(),
);
export const loadApps = cache((): AppConfig[] =>
  PUBLISHED.map((entry) =>
    appConfigSchema.parse(read(join(REPO, "apps", entry.app, "cookiebannerbench.json"))),
  ),
);
export const loadTargets = cache((): Record<string, Target> => {
  const raw = read(join(REPO, "targets.json")) as Record<string, unknown>;
  return Object.fromEntries(
    PUBLISHED.flatMap((entry) => {
      const parsed = targetSchema.safeParse(raw[entry.app]);
      return parsed.success ? [[entry.app, parsed.data]] : [];
    }),
  );
});
/**
 * What the test app is, read off its own package.json and tsconfig.
 *
 * Only facts that are on disk. There is deliberately no `bundler` here: every
 * app runs a bare `next build` with no bundler pinned in its config, so which
 * bundler ran is Next's default for that version and nothing in this repo
 * records it. The run conditions on the method page are where a constant of
 * the harness belongs, stated once and accurately.
 */
export function loadAppMetadata(app: string) {
  const entry = publishedTarget(app);
  if (!entry) throw new Error("Unpublished app");
  const pkg = read(join(REPO, "apps", app, "package.json")) as {
    dependencies?: Record<string, string>;
  };
  const deps = pkg.dependencies ?? {};
  let license = "Not recorded";
  let openSource = "Not recorded";
  if (entry.package) {
    const file = join(REPO, "apps", app, "node_modules", entry.package, "package.json");
    if (existsSync(file)) {
      const installed = read(file) as { license?: string };
      license = installed.license ?? license;
      if (["MIT", "Apache-2.0", "GPL-3.0-only"].includes(license))
        openSource = "Yes (package license)";
    }
  }
  return {
    framework: deps.next ? `Next.js ${deps.next}` : "Not recorded",
    language: existsSync(join(REPO, "apps", app, "tsconfig.json"))
      ? "TypeScript / JavaScript"
      : "JavaScript",
    bundleType:
      entry.installModel === "vendor-cdn"
        ? "External script"
        : entry.installModel === "control"
          ? "No consent SDK"
          : "App-bundled package",
    license,
    openSource,
  };
}

/**
 * Every individual load for one published app in one run, for the run
 * distribution on its detail page. Parsed on demand rather than in the manifest
 * schema so the 1,600-object array is not held for every page build.
 */
const measurementSchema = z.object({
  app: z.string(),
  profile: z.string(),
  cache: z.enum(["cold", "warm"]),
  iteration: z.number().int(),
  bannerVisible: z.number().nullable(),
  lcp: z.number().nullable(),
  cls: z.number().nullable(),
  tbt: z.number().nullable(),
  transferBytes: z.number().nullable(),
  bannerViewportCoverage: z.number().nullable(),
});
export type Measurement = z.infer<typeof measurementSchema>;
export const loadMeasurements = cache((app: string, id = publishedRunId()): Measurement[] => {
  if (!publishedTarget(app) || !id) return [];
  const raw = read(join(REPO, "results", id, "run.json")) as { measurements?: unknown[] };
  return (raw.measurements ?? [])
    .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
    .filter((m) => m.app === app)
    .map((m) => measurementSchema.parse(m));
});
