import { chromium } from "playwright";
import { installCollector, readSample } from "./collector.js";
import type { AppConfig, TargetMap } from "./types.js";

/**
 * Verifies each target is reachable and actually renders its banner, before a
 * sweep commits hours to it.
 *
 * This exists because a stale deployment or a renamed selector fails *quietly*:
 * the harness records "no banner", the run completes, and the numbers look
 * plausible. c15t renaming its banner test id between 1.8.1 and 2.2.1 is
 * exactly this — every iteration would report a missing banner and nothing
 * would flag it.
 */

export type PreflightStatus = "ok" | "no-banner" | "inert-banner" | "protected" | "unreachable";

export interface PreflightResult {
  app: string;
  url: string;
  status: PreflightStatus;
  /** The selector that matched, when one did. */
  selector: string | null;
  /** When the banner became visible, in ms from navigation. */
  bannerAt: number | null;
  /**
   * When the banner first accepted a click, in ms from navigation.
   *
   * Null here is an operational signal, not a datum: a banner that is visible
   * and never clickable is either genuinely inert or a control this probe does
   * not recognise, and both need a person to look before a run publishes an
   * unmeasured Arrival score for it.
   */
  usableAt: number | null;
  detail: string;
}

/** How long to wait for a banner before calling it missing. */
const BANNER_TIMEOUT_MS = 20_000;
const NAV_TIMEOUT_MS = 45_000;

/**
 * Vercel and Netlify both answer a protected deployment with a login page
 * rather than an error, so a 200 alone proves nothing.
 */
function looksProtected(url: string, title: string, body: string): boolean {
  const haystack = `${url} ${title} ${body}`.toLowerCase();
  return (
    haystack.includes("vercel.com/sso") ||
    haystack.includes("authentication required") ||
    (haystack.includes("log in") && haystack.includes("vercel")) ||
    haystack.includes("deployment protection")
  );
}

export async function preflight(
  apps: readonly AppConfig[],
  targets: TargetMap,
  onResult?: (result: PreflightResult) => void,
): Promise<PreflightResult[]> {
  const browser = await chromium.launch({ headless: true });
  const results: PreflightResult[] = [];
  try {
    for (const app of apps) {
      const target = targets[app.name];
      if (!target) {
        continue;
      }
      const result = await checkOne(browser, app, target.url);
      results.push(result);
      onResult?.(result);
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function checkOne(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  app: AppConfig,
  url: string,
): Promise<PreflightResult> {
  const base = { app: app.name, url, selector: null, bannerAt: null, usableAt: null };
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await installCollector(page, app.bannerSelectors);
    const response = await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      return { ...base, status: "unreachable", detail: `HTTP ${status}` };
    }

    const title = await page.title();
    const body = (
      await page
        .locator("body")
        .innerText()
        .catch(() => "")
    ).slice(0, 400);
    if (looksProtected(page.url(), title, body)) {
      return {
        ...base,
        status: "protected",
        detail: "login wall — turn Deployment Protection off",
      };
    }

    // An app that declares no selectors is headless on purpose (core), and a
    // missing banner is the expected result rather than a failure.
    if (app.bannerSelectors.length === 0) {
      return { ...base, status: "ok", detail: "headless by design — no banner expected" };
    }

    try {
      await page.waitForFunction(
        () => window.__cookiebannerbench?.bannerVisible !== null,
        undefined,
        {
          timeout: BANNER_TIMEOUT_MS,
          polling: 200,
        },
      );
    } catch {
      return {
        ...base,
        status: "no-banner",
        detail: `no match for ${app.bannerSelectors.join(", ")}`,
      };
    }

    // The probe gives up 5s after the banner appears, so 6s is long enough to
    // know the answer rather than to be still waiting for it.
    const becameUsable = await page
      .waitForFunction(() => window.__cookiebannerbench?.bannerInteractive !== null, undefined, {
        timeout: 6_000,
        polling: 100,
      })
      .then(() => true)
      .catch(() => false);

    const sample = await readSample(page);
    // The selector that actually matched, not the first one declared: a
    // diagnostic that exists to catch a renamed selector has to name the one
    // in use.
    const selector = await page.evaluate(() => window.__cookiebannerbench?.bannerSelector ?? null);
    const visible = `banner at ${Math.round(sample.bannerVisible ?? 0)}ms`;
    if (!becameUsable) {
      return {
        ...base,
        selector,
        bannerAt: sample.bannerVisible,
        status: "inert-banner",
        detail: `${visible}, no control accepted a click within 5s`,
      };
    }
    const usable = sample.bannerInteractive ?? 0;
    const gap = Math.round(usable - (sample.bannerVisible ?? 0));
    return {
      app: app.name,
      url,
      status: "ok",
      selector,
      bannerAt: sample.bannerVisible,
      usableAt: sample.bannerInteractive,
      detail: `${visible}, usable at ${Math.round(usable)}ms (+${gap}ms)`,
    };
  } catch (error) {
    return {
      ...base,
      status: "unreachable",
      detail: error instanceof Error ? (error.message.split("\n")[0] ?? "failed") : "failed",
    };
  } finally {
    await context.close();
  }
}

/** True when every target is usable for a run. */
export function allPassed(results: readonly PreflightResult[]): boolean {
  return results.every((r) => r.status === "ok");
}
