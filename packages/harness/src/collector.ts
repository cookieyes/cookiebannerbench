import type { Page } from "playwright";
import { isVendorResource, kindTotals, vendorTotals } from "./attribution.js";
import { type WireRequest, wireTotals } from "./network.js";
import type { Sample } from "./types.js";

/**
 * Everything below `installCollector` runs **inside the measured page**, so it
 * is written to cost as close to nothing as possible: no logging, no polling
 * loops, no synchronous work. Two rules matter here.
 *
 * 1. Never block the main thread. The metrics we report (TBT, TTI, CLS) are
 *    measurements *of* the main thread, so any work the probe does lands in
 *    the result and inflates whichever SDK happens to trigger it.
 * 2. Start observing at document-start. A probe that begins looking for the
 *    banner after a fixed delay cannot report any paint that happened sooner
 *    than that delay, which silently compresses the fastest SDKs into a tie.
 */

/** `layout-shift` entries, which TypeScript's DOM lib does not model. */
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface CollectorState {
  fcp: number | null;
  lcp: number;
  /** LCP over entries whose element is not inside the banner. */
  contentLcp: number;
  cls: number;
  clsBeforeBanner: number | null;
  lastLongTaskEnd: number;
  blockingTime: number;
  bannerVisible: number | null;
  bannerInteractive: number | null;
  bannerSelector: string | null;
  bannerViewportCoverage: number;
}

declare global {
  interface Window {
    __cookiebannerbench?: CollectorState;
  }
}

/**
 * Registers the in-page probe. Must be called before any navigation so the
 * observers exist before the first byte is parsed.
 */
export async function installCollector(page: Page, selectors: string[]): Promise<void> {
  await page.addInitScript((bannerSelectors: string[]) => {
    const state: CollectorState = {
      fcp: null,
      lcp: 0,
      contentLcp: 0,
      cls: 0,
      clsBeforeBanner: null,
      lastLongTaskEnd: 0,
      blockingTime: 0,
      bannerVisible: null,
      bannerInteractive: null,
      bannerSelector: null,
      bannerViewportCoverage: 0,
    };
    window.__cookiebannerbench = state;

    const observe = (type: string, callback: (entries: PerformanceEntryList) => void): void => {
      try {
        new PerformanceObserver((list) => {
          callback(list.getEntries());
        }).observe({ type, buffered: true });
      } catch {
        // An unsupported entry type leaves its metric at its initial value
        // rather than taking down the whole probe.
      }
    };

    observe("paint", (entries) => {
      for (const entry of entries) {
        if (entry.name === "first-contentful-paint" && state.fcp === null) {
          state.fcp = entry.startTime;
        }
      }
    });

    /**
     * Whether an element belongs to the consent banner, climbing out of shadow
     * roots so a banner that encapsulates its markup is still recognised.
     * Decided at observation time, while the element is still attached — an
     * LCP element that is later removed can no longer be traced to its banner.
     */
    const isInBanner = (element: Element | null): boolean => {
      let node: Element | null = element;
      let hops = 0;
      while (node && hops < 8) {
        for (const selector of bannerSelectors) {
          try {
            if (node.closest(selector)) return true;
          } catch {
            // A malformed selector is skipped here as it is everywhere else.
          }
        }
        const root = node.getRootNode();
        node = root instanceof ShadowRoot ? root.host : null;
        hops += 1;
      }
      return false;
    };

    observe("largest-contentful-paint", (entries) => {
      for (const entry of entries) {
        state.lcp = Math.max(state.lcp, entry.startTime);
        // Raw LCP charges a consent banner for being fast: when the banner is
        // the largest thing on screen, an early banner *is* a late LCP. The
        // page's own largest paint is the cost the host actually pays, so the
        // banner's entries are excluded. An entry whose element the browser
        // did not expose counts as content — the host's, not the banner's.
        const element = (entry as PerformanceEntry & { element?: Element | null }).element ?? null;
        if (!isInBanner(element)) {
          state.contentLcp = Math.max(state.contentLcp, entry.startTime);
        }
      }
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries as LayoutShiftEntry[]) {
        // Shifts within 500ms of a user interaction are excluded from CLS by
        // definition. Nothing interacts with the page here, but the guard keeps
        // the metric identical to what a field measurement would report.
        if (!entry.hadRecentInput) {
          state.cls += entry.value;
        }
      }
    });

    observe("longtask", (entries) => {
      for (const entry of entries) {
        state.lastLongTaskEnd = Math.max(state.lastLongTaskEnd, entry.startTime + entry.duration);
        // Total Blocking Time counts only the part of a task beyond 50ms.
        state.blockingTime += Math.max(0, entry.duration - 50);
      }
    });

    if (bannerSelectors.length === 0) {
      return;
    }

    const isVisible = (element: Element): boolean => {
      // checkVisibility covers display/visibility/opacity/content-visibility in
      // one call; the rect check below is the fallback for older engines.
      const withCheck = element as Element & {
        checkVisibility?: (options: {
          opacityProperty: boolean;
          visibilityProperty: boolean;
        }) => boolean;
      };
      if (typeof withCheck.checkVisibility === "function") {
        if (!withCheck.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
          return false;
        }
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const findBanner = (): Element | null => {
      for (const selector of bannerSelectors) {
        let element: Element | null = null;
        try {
          element = document.querySelector(selector);
        } catch {
          // A malformed selector in an app's config shouldn't abort the others.
          continue;
        }
        if (element && isVisible(element)) {
          state.bannerSelector = selector;
          return element;
        }
      }
      return null;
    };

    /**
     * What counts as a control the user could act on. `a` without `href` is
     * excluded: a bare anchor is a label, not a target.
     */
    const CONTROL_SELECTOR =
      'button, a[href], [role="button"], input[type="button"], input[type="submit"]';

    /** A control the page has explicitly turned off cannot be acted on. */
    const isEnabled = (control: Element): boolean =>
      !control.hasAttribute("disabled") && control.getAttribute("aria-disabled") !== "true";

    /** Enabled controls reachable from one root without crossing a shadow boundary. */
    const controlsIn = (root: ParentNode): Element[] =>
      Array.from(root.querySelectorAll<Element>(CONTROL_SELECTOR)).filter(isEnabled).slice(0, 8);

    /**
     * Enabled controls inside shadow roots under the banner.
     *
     * `querySelectorAll` does not cross a shadow boundary, so a banner that
     * encapsulates its buttons would look like a banner with no buttons at all.
     * Finding the hosts means walking the subtree, so this is only consulted on
     * frames where the light DOM produced nothing clickable — which is the
     * window before the banner is usable, and never after.
     */
    const shadowControls = (root: ParentNode, depth = 0): Element[] => {
      if (depth > 4) return [];
      const found: Element[] = [];
      for (const host of Array.from(root.querySelectorAll<Element>("*"))) {
        const shadow = host.shadowRoot;
        if (!shadow) continue;
        found.push(...controlsIn(shadow), ...shadowControls(shadow, depth + 1));
        if (found.length >= 8) break;
      }
      return found;
    };

    /**
     * Whether a real click at the control's centre would reach the control.
     *
     * `elementFromPoint` is the only honest test of this. It accounts for
     * anything painted over the control, for `pointer-events: none` anywhere in
     * its ancestry, and for a control sitting outside the viewport — none of
     * which `offsetParent` can see, which is why the previous check reported
     * every banner usable in the same millisecond it became visible.
     *
     * The deepest hit element is usually the control's own label span, so a
     * descendant counts. An *ancestor* does not: being hit through the control
     * means the control itself is not taking pointer events.
     */
    const isClickable = (control: Element): boolean => {
      const rect = control.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
      let hit = document.elementFromPoint(x, y);
      // `elementFromPoint` stops at a shadow host, so descend through shadow
      // roots to reach the element a click would actually land on.
      let depth = 0;
      while (hit?.shadowRoot && depth < 8) {
        const inner = hit.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === hit) break;
        hit = inner;
        depth += 1;
      }
      return hit !== null && (hit === control || control.contains(hit));
    };

    /**
     * Whether anything from the control up to the document is mid-animation.
     *
     * A banner that slides or fades in is visible on its first frame and moves
     * under the cursor for the next several hundred milliseconds; a click aimed
     * at it during that window lands somewhere else. Transitions live on the
     * banner or on a wrapper above it, so this walks the ancestor chain rather
     * than asking the control alone. Failure to answer is treated as "moving",
     * which falls through to the stricter geometric test below.
     */
    const isSettling = (control: Element): boolean => {
      try {
        let node: Element | null = control;
        let depth = 0;
        while (node && depth < 24) {
          const running = node
            .getAnimations()
            .some((animation) => animation.playState === "running");
          if (running) return true;
          node = node.parentElement;
          depth += 1;
        }
        return false;
      } catch {
        return true;
      }
    };

    /** Position and size, to the pixel, for the frame-to-frame comparison. */
    const geometry = (control: Element): string => {
      const rect = control.getBoundingClientRect();
      return [
        control.tagName,
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
      ].join(":");
    };

    /**
     * A banner is usable at the first frame where some enabled control is
     * clickable *and* is not about to move: either nothing in its ancestry is
     * animating, or its geometry is identical to the previous frame. The second
     * clause is the fallback for an engine that will not report animations, and
     * for an animation this probe cannot see; it costs one frame (~16ms on a
     * 60Hz compositor), which is why a gap of a single frame means "instant"
     * rather than "delayed".
     */
    let previousGeometry: string | null = null;

    /**
     * How long after the banner appears to keep looking. The loop is one
     * hit test per frame and stops the moment it succeeds, but a banner that
     * never becomes clickable must not leave it running for the whole
     * measurement window — that cost would land in the TBT of the very SDK it
     * was trying to measure. Past the deadline the metric stays null, which the
     * scoring model reports as unmeasured rather than as zero.
     */
    const USABLE_DEADLINE_MS = 5000;

    let frame = 0;
    const check = (): void => {
      const now = performance.now();

      if (state.bannerVisible === null) {
        const banner = findBanner();
        if (banner) {
          state.bannerVisible = now;
          // CLS accumulated up to this point is the page's own; anything after
          // is attributable to the banner arriving.
          state.clsBeforeBanner = state.cls;
          const rect = banner.getBoundingClientRect();
          const viewport = window.innerWidth * window.innerHeight;
          state.bannerViewportCoverage = viewport > 0 ? (rect.width * rect.height) / viewport : 0;
        }
      }

      if (state.bannerVisible !== null && state.bannerInteractive === null) {
        if (now - state.bannerVisible > USABLE_DEADLINE_MS) {
          cancelAnimationFrame(frame);
          return;
        }
        const banner = state.bannerSelector ? document.querySelector(state.bannerSelector) : null;
        const clickable = banner
          ? (controlsIn(banner).find(isClickable) ??
            shadowControls(banner).find(isClickable) ??
            null)
          : null;
        const here = clickable ? geometry(clickable) : null;
        if (clickable && (!isSettling(clickable) || here === previousGeometry)) {
          state.bannerInteractive = now;
          cancelAnimationFrame(frame);
          return;
        }
        previousGeometry = here;
      }

      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
  }, selectors);
}

/**
 * Reads the probe's state plus both byte accountings once the page has settled.
 * Safe to call on a page where the probe never installed (about:blank, a
 * navigation failure) — it reports zeroes rather than throwing.
 *
 * `wire` is what the protocol saw. Passing an empty array leaves the `wire*`
 * metrics at zero, which is why the caller passes `undefined` rather than `[]`
 * when it recorded nothing: an absent recording is not a page that transferred
 * nothing.
 */
export async function readSample(
  page: Page,
  serviceHosts: string[] = [],
  wire?: readonly WireRequest[],
): Promise<Sample> {
  const raw = await page.evaluate(() => {
    const state = window.__cookiebannerbench;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    const sizeOf = (entry: PerformanceResourceTiming): number =>
      entry.transferSize || entry.encodedBodySize || 0;
    const transferBytes = resources.reduce((total, entry) => total + sizeOf(entry), 0);
    const requestCount = resources.length;
    const origin = window.location.origin;
    const thirdPartyBytes = resources
      .filter((entry) => !entry.name.startsWith(origin))
      .reduce((total, entry) => total + sizeOf(entry), 0);
    const scriptLoadMs = resources
      .filter((entry) => entry.initiatorType === "script")
      .reduce((total, entry) => total + entry.duration, 0);

    // Flattened for attribution in Node, where the rules are unit tested.
    const entries = resources.map((entry) => ({
      name: entry.name,
      size: sizeOf(entry),
      initiatorType: entry.initiatorType,
      duration: entry.duration,
      dnsMs: Math.max(0, entry.domainLookupEnd - entry.domainLookupStart),
      connectMs: Math.max(0, entry.connectEnd - entry.connectStart),
    }));

    if (!state) {
      return {
        fcp: 0,
        lcp: 0,
        contentLcp: 0,
        cls: 0,
        tbt: 0,
        tti: 0,
        transferBytes,
        requestCount,
        thirdPartyBytes,
        scriptLoadMs,
        bannerVisible: null,
        bannerInteractive: null,
        bannerLayoutShift: 0,
        bannerViewportCoverage: 0,
        entries,
      };
    }

    const fcp = state.fcp ?? 0;
    // Approximate TTI as the point after which the main thread went quiet:
    // the end of the last long task, never earlier than FCP or DOMContentLoaded.
    const tti = Math.max(fcp, navigation?.domContentLoadedEventEnd ?? 0, state.lastLongTaskEnd);

    return {
      fcp,
      lcp: state.lcp,
      contentLcp: state.contentLcp,
      cls: state.cls,
      tbt: state.blockingTime,
      tti,
      transferBytes,
      requestCount,
      thirdPartyBytes,
      scriptLoadMs,
      bannerVisible: state.bannerVisible,
      bannerInteractive: state.bannerInteractive,
      bannerLayoutShift:
        state.clsBeforeBanner === null ? 0 : Math.max(0, state.cls - state.clsBeforeBanner),
      bannerViewportCoverage: state.bannerViewportCoverage,
      entries,
    };
  });
  const { entries, ...sample } = raw;
  const origin = page.url().startsWith("http") ? new URL(page.url()).origin : "";
  return {
    ...sample,
    ...vendorTotals(entries, serviceHosts),
    ...kindTotals(entries, sample.transferBytes),
    ...(wire
      ? wireTotals(wire, origin, (url) => isVendorResource(url, serviceHosts))
      : {
          wireBytes: 0,
          wireRequests: 0,
          wireThirdPartyBytes: 0,
          wireVendorBytes: 0,
          wireVendorRequests: 0,
          wireThirdPartyOrigins: 0,
          wireThirdPartySetupMs: 0,
        }),
  };
}
