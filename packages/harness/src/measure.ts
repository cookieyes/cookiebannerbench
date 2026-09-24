import type { Browser, BrowserContext, Page } from "playwright";
import { installCollector, readSample } from "./collector.js";
import { type NetworkEventSource, recordNetwork, type WireRequest } from "./network.js";
import type { DeviceProfile } from "./profiles.js";
import type { Sample } from "./types.js";

/** How long the main thread must stay quiet before a page counts as settled. */
const QUIET_WINDOW_MS = 2_000;
/** How long to keep waiting for a banner that may never arrive. */
const BANNER_TIMEOUT_MS = 15_000;
/** Hard ceiling on a single page load, including the settle wait. */
const LOAD_TIMEOUT_MS = 60_000;

/**
 * Attaches the CDP session: throttling, and the byte recorder that sees what
 * the page is not allowed to. Must run before navigation so the very first
 * request is both subject to the profile and counted.
 *
 * The CDP session is deliberately left attached — detaching resets the
 * emulation we just configured and ends the recording.
 *
 * Returns the recording, read after the page has settled.
 */
async function attachSession(page: Page, profile: DeviceProfile): Promise<() => WireRequest[]> {
  const session = await page.context().newCDPSession(page);
  // Enabled unconditionally now, not only for the throttled profiles: the byte
  // accounting depends on these events, so an unthrottled run must record them
  // too or `fast-desktop` would silently lose every vendor's bytes.
  await session.send("Network.enable");
  const recording = recordNetwork(session as unknown as NetworkEventSource);
  if (profile.cpuThrottlingRate !== 1) {
    await session.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuThrottlingRate });
  }
  if (profile.network) {
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      // Profiles are written in Kbps; CDP wants bytes per second.
      downloadThroughput: (profile.network.downloadKbps * 1024) / 8,
      uploadThroughput: (profile.network.uploadKbps * 1024) / 8,
      latency: profile.network.latencyMs,
    });
  }
  return recording;
}

/**
 * Waits until the page has both loaded and gone quiet, so late-arriving
 * banners and their layout shifts are inside the measurement window.
 *
 * Returns without throwing if the banner never appears — "no banner detected"
 * is a legitimate result for a headless SDK, not an error.
 */
async function waitUntilSettled(page: Page, expectsBanner: boolean): Promise<void> {
  await page.waitForLoadState("load", { timeout: LOAD_TIMEOUT_MS });
  await page.waitForFunction(
    ({ quietMs, bannerTimeoutMs, needsBanner }) => {
      const state = window.__consentbench;
      const navigation = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const now = performance.now();
      const lastActivity = Math.max(state?.lastLongTaskEnd ?? 0, navigation?.loadEventEnd ?? 0);
      const quiet = now - lastActivity >= quietMs;
      const bannerResolved =
        !needsBanner || state?.bannerVisible !== null || now >= bannerTimeoutMs;
      return quiet && bannerResolved;
    },
    {
      quietMs: QUIET_WINDOW_MS,
      bannerTimeoutMs: BANNER_TIMEOUT_MS,
      needsBanner: expectsBanner,
    },
    { timeout: LOAD_TIMEOUT_MS, polling: 250 },
  );
}

async function measurePage(
  context: BrowserContext,
  url: string,
  selectors: string[],
  profile: DeviceProfile,
  serviceHosts: string[],
): Promise<Sample> {
  const page = await context.newPage();
  try {
    await installCollector(page, selectors);
    const recording = await attachSession(page, profile);
    await page.goto(url, { waitUntil: "commit", timeout: LOAD_TIMEOUT_MS });
    await waitUntilSettled(page, selectors.length > 0);
    return await readSample(page, serviceHosts, recording());
  } finally {
    await page.close();
  }
}

/**
 * Measures one cold load in a browser context of its own.
 *
 * A fresh `BrowserContext` per load guarantees an empty HTTP cache and empty
 * storage, so every load is a first visit by a visitor who has never seen this
 * banner. That is the condition every published number is measured on.
 *
 * There was a warm load here — a second page in the same context — and it was
 * removed rather than fixed, because it conflated three different things and
 * scored none of them honestly:
 *
 *   - Bytes. A cache hit transfers nothing, so both sides of the delta against
 *     the control collapsed to roughly zero and every installation scored
 *     98-100 on Weight. A quarter of the score that could not tell a 19 KB
 *     install from a 353 KB one.
 *   - Consent state. The second page shared the first page's cookies and
 *     localStorage, so an SDK that remembers having shown a banner behaves
 *     differently — Osano showed none at all, leaving its row unscoreable.
 *   - Cache policy. What was left measured the vendor's cache headers rather
 *     than its code, and compressed exactly the differences this benchmark
 *     exists to show: the slowest installations gained the most, and the
 *     fastest gained nothing.
 *
 * A repeat-visit condition is worth measuring, but it has to isolate one of
 * those: same HTTP cache, cleared cookies and storage, reported rather than
 * scored. Re-adding it should be a deliberate act with that spec, not a second
 * page load that happens to be cheap to take.
 */
export async function measureCold(
  browser: Browser,
  url: string,
  selectors: string[],
  profile: DeviceProfile,
  serviceHosts: string[] = [],
): Promise<Sample> {
  const context = await browser.newContext();
  try {
    return await measurePage(context, url, selectors, profile, serviceHosts);
  } finally {
    await context.close();
  }
}
