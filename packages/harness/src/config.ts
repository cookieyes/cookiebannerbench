import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AppConfig, TargetMap } from "./types.js";

const CONFIG_FILE = "cookiebannerbench.json";
const TARGETS_FILE = "targets.json";

function fail(where: string, problem: string): never {
  throw new Error(`${where}: ${problem}`);
}

function asStringArray(value: unknown, where: string, field: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(where, `"${field}" must be an array of strings`);
  }
  return value as string[];
}

export function parseAppConfig(raw: string, where: string): AppConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(where, `not valid JSON (${error instanceof Error ? error.message : "unknown"})`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    fail(where, "must contain a JSON object");
  }
  const config = parsed as Record<string, unknown>;
  const { name, label, vendor } = config;
  if (typeof name !== "string" || name.length === 0) {
    fail(where, '"name" is required');
  }
  if (typeof label !== "string" || label.length === 0) {
    fail(where, '"label" is required');
  }
  if (typeof vendor !== "string" || vendor.length === 0) {
    fail(where, '"vendor" is required');
  }
  return {
    name,
    label,
    vendor,
    bannerSelectors: asStringArray(config.bannerSelectors, where, "bannerSelectors"),
    serviceHosts: asStringArray(config.serviceHosts, where, "serviceHosts"),
    tags: asStringArray(config.tags, where, "tags"),
  };
}

/** Reads every cookiebannerbench.json under the apps directory, sorted by name. */
export function loadApps(appsDir: string): AppConfig[] {
  if (!existsSync(appsDir)) {
    fail(appsDir, "apps directory not found");
  }
  const apps: AppConfig[] = [];
  for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const configPath = join(appsDir, entry.name, CONFIG_FILE);
    if (!existsSync(configPath)) {
      continue;
    }
    const config = parseAppConfig(readFileSync(configPath, "utf8"), configPath);
    if (config.name !== entry.name) {
      fail(configPath, `"name" is "${config.name}" but the directory is "${entry.name}"`);
    }
    apps.push(config);
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/** True for http://localhost and http://127.0.0.1 URLs. */
function isLoopback(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function parseTargets(raw: string, where: string): TargetMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(where, `not valid JSON (${error instanceof Error ? error.message : "unknown"})`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    fail(where, "must contain a JSON object");
  }
  const targets: TargetMap = {};
  for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) {
      fail(where, `"${name}" must be an object`);
    }
    const { url, version, deployedAt } = value as Record<string, unknown>;
    if (typeof url !== "string") {
      fail(where, `"${name}.url" is required`);
    }
    // http:// changes TLS and HTTP/2 negotiation, which is part of what we
    // measure, so a real target is always https. localhost is allowed purely
    // so the harness can be smoke-tested against `next start` — numbers from a
    // localhost target are not comparable with deployed ones.
    if (!url.startsWith("https://") && !isLoopback(url)) {
      fail(where, `"${name}.url" must be https (or a localhost URL, for local testing)`);
    }
    targets[name] = {
      url,
      version: typeof version === "string" ? version : "unknown",
      deployedAt: typeof deployedAt === "string" ? deployedAt : "unknown",
    };
  }
  return targets;
}

export function loadTargets(rootDir: string, file?: string): TargetMap {
  const path = file ?? join(rootDir, TARGETS_FILE);
  if (!existsSync(path)) {
    if (file) {
      fail(path, "targets file not found");
    }
    return {};
  }
  return parseTargets(readFileSync(path, "utf8"), path);
}
