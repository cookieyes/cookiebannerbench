/**
 * Byte accounting from outside the page.
 *
 * The in-page collector sums Resource Timing, which is the *page's* view of the
 * network and is deliberately censored: a cross-origin response reports a
 * `transferSize` of 0 unless its server sends `Timing-Allow-Origin`. None of
 * the CDN consent vendors do, so the page sees their scripts load, run and
 * render a banner while reporting that they cost nothing. Scoring that view
 * charges only the vendors transparent enough to be measured.
 *
 * The Chrome DevTools Protocol has no such restriction, because the harness is
 * the browser operator rather than the page. `Network.loadingFinished` reports
 * `encodedDataLength` — the bytes that actually crossed the wire, headers
 * included, compressed as sent — for every request regardless of origin.
 *
 * Both views are recorded. The protocol view is what the score uses; the page
 * view is kept beside it because the gap between them is itself the finding.
 */

/** One request as the protocol saw it. */
export interface WireRequest {
  /** Final URL, after any redirect. */
  url: string;
  /** Bytes over the wire including headers, as `loadingFinished` reports them. */
  bytes: number;
  /** CDP `resourceType`: Document, Script, Stylesheet, Font, Image, XHR, … */
  type: string;
  /** Served from the HTTP cache — real on a warm load, and genuinely ~0 bytes. */
  fromCache: boolean;
  /** Blocked, aborted or failed. Excluded from every total. */
  failed: boolean;
  /**
   * DNS lookup plus connection and TLS setup, when this request opened a new
   * connection. Zero on a reused connection. Read from the protocol's
   * `response.timing`, which — unlike Resource Timing — is not withheld for a
   * cross-origin host that omits `Timing-Allow-Origin`.
   */
  setupMs: number;
}

/** Only real network schemes count. `data:`/`blob:` never crossed a wire. */
export function isWireScheme(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export interface WireTotals {
  wireBytes: number;
  wireRequests: number;
  wireThirdPartyBytes: number;
  wireVendorBytes: number;
  wireVendorRequests: number;
  /**
   * Distinct hosts other than the page's own that the load contacted. Every
   * one of them received the visitor's IP address and user agent, and on this
   * fixture every one was contacted before anyone could answer the banner.
   */
  wireThirdPartyOrigins: number;
  /** Connection setup spent on those hosts, summed across connections. */
  wireThirdPartySetupMs: number;
}

/**
 * Totals for one page load.
 *
 * `pageOrigin` is the app's own origin, so "third party" means everything the
 * page pulled from somewhere else — which for these fixtures is the consent
 * vendor and nothing else. `isVendor` is passed in rather than imported so the
 * host-matching rule stays in one place (`attribution.ts`).
 */
export function wireTotals(
  requests: readonly WireRequest[],
  pageOrigin: string,
  isVendor: (url: string) => boolean,
): WireTotals {
  const counted = requests.filter((request) => !request.failed && isWireScheme(request.url));
  const sameOrigin = (url: string) => url.startsWith(`${pageOrigin}/`) || url === pageOrigin;
  const vendor = counted.filter((request) => isVendor(request.url));
  const third = counted.filter((request) => !sameOrigin(request.url));
  const hostOf = (url: string) => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  };
  return {
    wireThirdPartyOrigins: new Set(third.map((request) => hostOf(request.url))).size,
    wireThirdPartySetupMs: third.reduce((total, request) => total + request.setupMs, 0),
    wireBytes: counted.reduce((total, request) => total + request.bytes, 0),
    wireRequests: counted.length,
    wireThirdPartyBytes: counted
      .filter((request) => !sameOrigin(request.url))
      .reduce((total, request) => total + request.bytes, 0),
    wireVendorBytes: vendor.reduce((total, request) => total + request.bytes, 0),
    wireVendorRequests: vendor.length,
  };
}

/** The subset of a CDP session this needs, so the recorder can be tested. */
export interface NetworkEventSource {
  on(event: string, handler: (params: never) => void): unknown;
}

/**
 * Records every request on a CDP session.
 *
 * A redirect never produces its own `loadingFinished`: the protocol reports it
 * as a `redirectResponse` attached to the *next* request on the same id. Its
 * headers are bytes the page paid for, so each redirect is recorded as its own
 * entry before the id is reused.
 */
export function recordNetwork(session: NetworkEventSource): () => WireRequest[] {
  const open = new Map<string, WireRequest>();
  const done: WireRequest[] = [];

  const on = session.on.bind(session) as (
    event: string,
    handler: (params: Record<string, never>) => void,
  ) => unknown;

  on("Network.requestWillBeSent", (params) => {
    const event = params as unknown as {
      requestId: string;
      request: { url: string };
      type?: string;
      redirectResponse?: { url: string; encodedDataLength?: number };
    };
    const previous = open.get(event.requestId);
    if (event.redirectResponse && previous) {
      done.push({
        ...previous,
        url: event.redirectResponse.url,
        bytes: Math.max(0, event.redirectResponse.encodedDataLength ?? 0),
      });
    }
    open.set(event.requestId, {
      url: event.request.url,
      bytes: 0,
      type: event.type ?? "Other",
      fromCache: false,
      failed: false,
      setupMs: 0,
    });
  });

  on("Network.responseReceived", (params) => {
    const event = params as unknown as {
      requestId: string;
      type?: string;
      response: {
        url: string;
        fromDiskCache?: boolean;
        fromPrefetchCache?: boolean;
        connectionReused?: boolean;
        timing?: { dnsStart: number; dnsEnd: number; connectStart: number; connectEnd: number };
      };
    };
    const request = open.get(event.requestId);
    if (!request) return;
    request.url = event.response.url;
    request.type = event.type ?? request.type;
    request.fromCache = Boolean(event.response.fromDiskCache ?? event.response.fromPrefetchCache);
    const timing = event.response.timing;
    // The protocol reports -1 for a phase that did not happen, so each span is
    // clamped rather than trusted; a reused connection paid for no setup.
    request.setupMs =
      timing && !event.response.connectionReused
        ? Math.max(0, timing.dnsEnd - timing.dnsStart) +
          Math.max(0, timing.connectEnd - timing.connectStart)
        : 0;
  });

  on("Network.loadingFinished", (params) => {
    const event = params as unknown as { requestId: string; encodedDataLength?: number };
    const request = open.get(event.requestId);
    if (!request) return;
    request.bytes = Math.max(0, event.encodedDataLength ?? 0);
    open.delete(event.requestId);
    done.push(request);
  });

  on("Network.loadingFailed", (params) => {
    const event = params as unknown as { requestId: string };
    const request = open.get(event.requestId);
    if (!request) return;
    // A request that never completed is excluded rather than counted as zero:
    // zero is a measurement, and this is the absence of one.
    request.failed = true;
    open.delete(event.requestId);
    done.push(request);
  });

  // Requests still in flight when the page is read are dropped: the load is
  // over, and a request with no `loadingFinished` has no byte count to report.
  return () => [...done];
}
