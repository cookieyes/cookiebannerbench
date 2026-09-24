#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { loadApps, loadTargets } from "./config.js";
import { allPassed, type PreflightResult, preflight } from "./preflight.js";
import { isProfileName, PROFILE_NAMES, type ProfileName } from "./profiles.js";
import { compare, formatComparison, formatRun, MIN_RELIABLE_ITERATIONS } from "./report.js";
import { run } from "./run.js";
import { scoreRun } from "./score.js";
import type { MetricKey, RunManifest } from "./types.js";

const USAGE = `consentbench — cookie-consent SDK performance harness

Usage:
  consentbench run [options]         Measure every app against its deployed target
  consentbench report [run] [opts]   Print a leaderboard for a completed run
  consentbench compare <base> <head> Diff two runs, flagging real regressions
  consentbench score [run] [opts]    Category scores for a completed run
  consentbench apps                  List the apps defined in this workspace
  consentbench preflight [opts]      Check every target renders its banner

Options for "preflight":
  --apps <a,b>          Only these apps
  --targets <file>      Targets manifest (default: targets.json)

Options for "run":
  --apps <a,b>          Only these apps (default: all with a target)
  --iterations <n>      Loads per app per profile per cache state (default: 20)
  --profiles <a,b>      Device profiles (default: ${PROFILE_NAMES.join(",")})
  --targets <file>      Targets manifest (default: targets.json)

Options for "report":
  --profile <name>      Device profile to show (default: fast-desktop)
  --cache <cold|warm>   Cache state to show (default: cold)
  --percentile <p>      p50, p75 or p95 (default: p75)

Options for "compare":
  --percentile <p>      p50, p75 or p95 (default: p75)
  --threshold <n>       Report changes of at least n percent (default: 5)

A run with no argument uses the most recent run under results/.
`;

interface Args {
  command: string | undefined;
  positional: string[];
  flags: Map<string, string>;
}

function parseArgs(argv: readonly string[]): Args {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const equals = token.indexOf("=");
    if (equals !== -1) {
      flags.set(token.slice(2, equals), token.slice(equals + 1));
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(token.slice(2), next);
      index++;
    } else {
      flags.set(token.slice(2), "true");
    }
  }
  return { command: positional[0], positional: positional.slice(1), flags };
}

/** Walks up from the cwd to the workspace root — the directory holding apps/. */
function findRoot(from: string): string {
  let current = resolve(from);
  for (;;) {
    if (existsSync(join(current, "apps")) && existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("could not find the consentbench workspace root from this directory");
    }
    current = parent;
  }
}

function readInt(flags: Map<string, string>, name: string, fallback: number): number {
  const raw = flags.get(name);
  if (raw === undefined) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

function readPercentile(flags: Map<string, string>): "p50" | "p75" | "p95" {
  const raw = flags.get("percentile") ?? "p75";
  if (raw !== "p50" && raw !== "p75" && raw !== "p95") {
    throw new Error(`--percentile must be p50, p75 or p95, got "${raw}"`);
  }
  return raw;
}

function readProfiles(flags: Map<string, string>): ProfileName[] {
  const raw = flags.get("profiles");
  if (raw === undefined) {
    return [...PROFILE_NAMES];
  }
  return raw.split(",").map((name) => {
    const trimmed = name.trim();
    if (!isProfileName(trimmed)) {
      throw new Error(`unknown profile "${trimmed}" — try one of ${PROFILE_NAMES.join(", ")}`);
    }
    return trimmed;
  });
}

/** Resolves a run id, a path to a run.json, or nothing (meaning: the latest). */
function loadRun(rootDir: string, reference: string | undefined): RunManifest {
  const resultsDir = join(rootDir, "results");
  let path: string;
  if (reference === undefined) {
    if (!existsSync(resultsDir)) {
      throw new Error("no results yet — run `consentbench run` first");
    }
    const runs = readdirSync(resultsDir).sort();
    const latest = runs.at(-1);
    if (latest === undefined) {
      throw new Error("no results yet — run `consentbench run` first");
    }
    path = join(resultsDir, latest, "run.json");
  } else if (reference.endsWith(".json")) {
    path = isAbsolute(reference) ? reference : resolve(reference);
  } else {
    path = join(resultsDir, reference, "run.json");
  }
  if (!existsSync(path)) {
    throw new Error(`no run found at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as RunManifest;
}

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  if (command === undefined || command === "help" || flags.has("help")) {
    process.stdout.write(USAGE);
    return;
  }

  const rootDir = findRoot(process.cwd());
  const apps = loadApps(join(rootDir, "apps"));

  switch (command) {
    case "apps": {
      const targets = loadTargets(rootDir, flags.get("targets"));
      for (const app of apps) {
        const target = targets[app.name];
        const where = target ? target.url : "(no target)";
        process.stdout.write(`${app.name.padEnd(26)} ${app.label.padEnd(30)} ${where}\n`);
      }
      return;
    }

    case "preflight": {
      const targets = loadTargets(rootDir, flags.get("targets"));
      const only = flags
        .get("apps")
        ?.split(",")
        .map((name) => name.trim());
      const selected = apps.filter((app) =>
        only ? only.includes(app.name) : targets[app.name] !== undefined,
      );
      if (selected.length === 0) {
        throw new Error("no apps selected — check --apps and the targets file");
      }
      const icon: Record<PreflightResult["status"], string> = {
        ok: "  OK  ",
        "no-banner": " FAIL ",
        "inert-banner": " FAIL ",
        protected: " FAIL ",
        unreachable: " FAIL ",
      };
      const results = await preflight(selected, targets, (r) => {
        process.stdout.write(
          `[${icon[r.status]}] ${r.app.padEnd(32)} ${r.status.padEnd(12)} ${r.detail}\n`,
        );
      });
      const failed = results.filter((r) => r.status !== "ok");
      process.stdout.write(
        `\n${results.length - failed.length}/${results.length} targets usable\n`,
      );
      if (!allPassed(results)) {
        for (const r of failed) {
          process.stdout.write(`  ${r.app}: ${r.url}\n`);
        }
        process.exitCode = 1;
      }
      return;
    }

    case "run": {
      const targets = loadTargets(rootDir, flags.get("targets"));
      const only = flags
        .get("apps")
        ?.split(",")
        .map((name) => name.trim());
      const selected = apps.filter((app) =>
        only ? only.includes(app.name) : targets[app.name] !== undefined,
      );
      if (selected.length === 0) {
        throw new Error("no apps selected — check --apps and targets.json");
      }
      const manifest = await run({
        rootDir,
        apps: selected,
        targets,
        iterations: readInt(flags, "iterations", 20),
        profiles: readProfiles(flags),
        onProgress: (message) => process.stdout.write(`${message}\n`),
      });
      const profile = manifest.profiles[0] ?? "fast-desktop";
      process.stdout.write(`\n${formatRun(manifest, profile, "cold")}\n`);
      return;
    }

    case "report": {
      const manifest = loadRun(rootDir, positional[0]);
      const profile = flags.get("profile") ?? manifest.profiles[0] ?? "fast-desktop";
      const cache = flags.get("cache") ?? "cold";
      const columns = flags.get("metrics")?.split(",") as MetricKey[] | undefined;
      process.stdout.write(
        `${formatRun(manifest, profile, cache, columns, readPercentile(flags))}\n`,
      );
      return;
    }

    case "score": {
      const manifest = loadRun(rootDir, positional[0]);
      const profile = flags.get("profile") ?? manifest.profiles[0] ?? "fast-desktop";
      const cache = flags.get("cache") ?? "cold";
      const cards = scoreRun(manifest.summary, profile, cache, readPercentile(flags));
      if (cards.length === 0) {
        throw new Error(`no data for profile "${profile}" / cache "${cache}"`);
      }
      const labels = new Map(manifest.apps.map((a) => [a.name, a.label]));
      process.stdout.write(
        `${manifest.runId}  ${profile} / ${cache}  ${readPercentile(flags)}\n\n`,
      );
      for (const card of cards) {
        process.stdout.write(`${labels.get(card.app) ?? card.app} — ${card.total}/100\n`);
        for (const category of card.measured) {
          process.stdout.write(
            `  ${category.name} ${category.score}/${category.maxScore} (weight ${category.weight})\n`,
          );
          for (const d of category.details) {
            process.stdout.write(
              `      ${d.name.padEnd(26)} ${String(d.score).padStart(3)}/${String(d.maxScore).padEnd(3)} ${d.value.padEnd(12)} ${d.reason}\n`,
            );
          }
        }
        process.stdout.write("\n");
      }
      return;
    }

    case "compare": {
      const [baseRef, headRef] = positional;
      if (baseRef === undefined || headRef === undefined) {
        throw new Error("compare needs two runs: consentbench compare <base> <head>");
      }
      const base = loadRun(rootDir, baseRef);
      const head = loadRun(rootDir, headRef);
      const smallest = Math.min(base.iterations, head.iterations);
      if (smallest < MIN_RELIABLE_ITERATIONS) {
        process.stderr.write(
          `warning: comparing runs of ${smallest} iterations. Below ` +
            `${MIN_RELIABLE_ITERATIONS} the confidence intervals are too narrow to ` +
            `separate a real change from machine noise.\n\n`,
        );
      }
      const regressions = compare(base.summary, head.summary, readPercentile(flags));
      process.stdout.write(`${formatComparison(regressions, readInt(flags, "threshold", 5))}\n`);
      return;
    }

    default:
      throw new Error(`unknown command "${command}" — run \`consentbench help\``);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
