import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { measureCold } from "./measure.js";
import { getProfile, type ProfileName } from "./profiles.js";
import { summarise } from "./summarise.js";
import type { AppConfig, Measurement, RunFailure, RunManifest, TargetMap } from "./types.js";

export interface RunOptions {
  rootDir: string;
  apps: AppConfig[];
  targets: TargetMap;
  iterations: number;
  profiles: ProfileName[];
  onProgress?: (message: string) => void;
}

/**
 * Runs the full grid: profiles x iterations x apps x {cold, warm}.
 *
 * Apps are measured **interleaved within each iteration** rather than one app
 * to completion at a time. Over a long sweep the machine drifts — thermals,
 * background work, network conditions — and measuring app A entirely before
 * app B turns that drift into an apparent difference between A and B.
 * Interleaving spreads the drift across every app instead.
 */
export async function run(options: RunOptions): Promise<RunManifest> {
  const { rootDir, apps, targets, iterations, profiles } = options;
  const report = options.onProgress ?? (() => {});

  const resolved = apps.map((app) => {
    const target = targets[app.name];
    if (!target) {
      throw new Error(
        `no target for "${app.name}" in targets.json — deploy it, or drop it from --apps`,
      );
    }
    return { app, target };
  });

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const startedAt = new Date().toISOString();
  const measurements: Measurement[] = [];
  const failures: RunFailure[] = [];

  const outDir = join(rootDir, "results", runId);
  mkdirSync(outDir, { recursive: true });
  const appRecords = resolved.map(({ app, target }) => ({
    name: app.name,
    label: app.label,
    url: target.url,
    version: target.version,
  }));

  /**
   * The manifest as it stands, complete enough to score.
   *
   * `complete` says whether the grid finished. A partial run is a legitimate
   * artefact — fewer loads, wider intervals — but it must never be mistaken for
   * a full one, so the flag travels with the data rather than being inferred
   * from the measurement count.
   */
  const snapshot = (complete: boolean): RunManifest => ({
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    iterations,
    profiles,
    apps: appRecords,
    complete,
    ...(failures.length ? { failures } : {}),
    measurements,
    summary: summarise(measurements),
  });

  const write = (complete: boolean) => {
    // Written to a sibling and renamed, so a crash mid-write cannot leave a
    // truncated run.json behind — the previous checkpoint survives instead.
    const target = join(outDir, "run.json");
    const temp = `${target}.partial`;
    writeFileSync(temp, `${JSON.stringify(snapshot(complete), null, 2)}\n`);
    renameSync(temp, target);
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const profileName of profiles) {
      const profile = getProfile(profileName);
      for (let iteration = 1; iteration <= iterations; iteration++) {
        for (const { app, target } of resolved) {
          report(`${profileName} ${iteration}/${iterations} ${app.name}`);
          try {
            const sample = await measureCold(
              browser,
              target.url,
              app.bannerSelectors,
              profile,
              app.serviceHosts,
            );
            measurements.push({
              ...sample,
              app: app.name,
              profile: profileName,
              cache: "cold",
              iteration,
              at: new Date().toISOString(),
            });
          } catch (error) {
            // One page that will not settle is a fact about that page, not a
            // reason to throw away every measurement taken so far. It is
            // recorded, so a thin cell on the site can say what happened.
            failures.push({
              app: app.name,
              profile: profileName,
              iteration,
              at: new Date().toISOString(),
              reason: error instanceof Error ? error.message : String(error),
            });
            report(`  ! ${app.name} failed this iteration: ${failures.at(-1)?.reason ?? ""}`);
          }
        }
        // Checkpoint every iteration: a long sweep that dies at hour two still
        // leaves everything it measured, scoreable as a shorter run.
        write(false);
        report(`  checkpoint after ${profileName} ${iteration}/${iterations}`);
      }
    }
  } finally {
    await browser.close();
    write(measurements.length > 0);
  }

  const manifest = snapshot(true);
  write(true);
  report(`wrote ${join("results", runId, "run.json")}`);

  return manifest;
}
