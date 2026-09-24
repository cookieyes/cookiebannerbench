import { describe, expect, it } from "vitest";
import {
  isWireScheme,
  type NetworkEventSource,
  recordNetwork,
  type WireRequest,
  wireTotals,
} from "../network.js";

/** A stand-in CDP session that lets a test emit protocol events by hand. */
function fakeSession() {
  const handlers = new Map<string, ((params: never) => void)[]>();
  const session: NetworkEventSource = {
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return session;
    },
  };
  const emit = (event: string, params: unknown) => {
    for (const handler of handlers.get(event) ?? []) handler(params as never);
  };
  return { session, emit };
}

const sent = (id: string, url: string, type = "Script") => [
  "Network.requestWillBeSent",
  { requestId: id, request: { url }, type },
];
const received = (id: string, url: string, extra: Record<string, unknown> = {}) => [
  "Network.responseReceived",
  { requestId: id, response: { url, ...extra } },
];
const finished = (id: string, bytes: number) => [
  "Network.loadingFinished",
  { requestId: id, encodedDataLength: bytes },
];

describe("recordNetwork", () => {
  it("records the wire length of each completed request", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://app.example/page.js") as [string, unknown]));
    emit(...(received("1", "https://app.example/page.js") as [string, unknown]));
    emit(...(finished("1", 1234) as [string, unknown]));
    expect(read()).toEqual([
      {
        url: "https://app.example/page.js",
        bytes: 1234,
        type: "Script",
        fromCache: false,
        failed: false,
        setupMs: 0,
      },
    ]);
  });

  // The whole point of this module: a cross-origin host that withholds
  // Timing-Allow-Origin is invisible to the page and fully visible here.
  it("records a cross-origin response the page would have reported as zero", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://cdn.vendor.example/sdk.js") as [string, unknown]));
    emit(...(received("1", "https://cdn.vendor.example/sdk.js") as [string, unknown]));
    emit(...(finished("1", 204_900) as [string, unknown]));
    expect(read()[0]?.bytes).toBe(204_900);
  });

  it("keeps a redirect as its own entry", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://vendor.example/sdk") as [string, unknown]));
    emit("Network.requestWillBeSent", {
      requestId: "1",
      request: { url: "https://cdn.vendor.example/sdk.js" },
      type: "Script",
      redirectResponse: { url: "https://vendor.example/sdk", encodedDataLength: 320 },
    });
    emit(...(received("1", "https://cdn.vendor.example/sdk.js") as [string, unknown]));
    emit(...(finished("1", 5000) as [string, unknown]));
    const all = read();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.bytes)).toEqual([320, 5000]);
  });

  it("takes the final URL from the response, not the request", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://vendor.example/sdk") as [string, unknown]));
    emit(...(received("1", "https://cdn.vendor.example/real.js") as [string, unknown]));
    emit(...(finished("1", 10) as [string, unknown]));
    expect(read()[0]?.url).toBe("https://cdn.vendor.example/real.js");
  });

  it("marks a failed request rather than recording it as zero bytes", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://blocked.example/x.js") as [string, unknown]));
    emit("Network.loadingFailed", { requestId: "1" });
    expect(read()[0]?.failed).toBe(true);
  });

  it("notes a cached response, which is genuinely cheap on a warm load", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://app.example/a.js") as [string, unknown]));
    emit(
      ...(received("1", "https://app.example/a.js", { fromDiskCache: true }) as [string, unknown]),
    );
    emit(...(finished("1", 0) as [string, unknown]));
    expect(read()[0]?.fromCache).toBe(true);
  });

  it("records connection setup only when the connection was new", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    const timing = { dnsStart: 0, dnsEnd: 150, connectStart: 150, connectEnd: 450 };
    emit(...(sent("1", "https://cdn.vendor.example/a.js") as [string, unknown]));
    emit("Network.responseReceived", {
      requestId: "1",
      response: { url: "https://cdn.vendor.example/a.js", connectionReused: false, timing },
    });
    emit(...(finished("1", 10) as [string, unknown]));
    emit(...(sent("2", "https://cdn.vendor.example/b.js") as [string, unknown]));
    emit("Network.responseReceived", {
      requestId: "2",
      response: { url: "https://cdn.vendor.example/b.js", connectionReused: true, timing },
    });
    emit(...(finished("2", 10) as [string, unknown]));
    expect(read().map((r) => r.setupMs)).toEqual([450, 0]);
  });

  it("treats a phase the protocol marks -1 as not having happened", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://cdn.vendor.example/a.js") as [string, unknown]));
    emit("Network.responseReceived", {
      requestId: "1",
      response: {
        url: "https://cdn.vendor.example/a.js",
        connectionReused: false,
        timing: { dnsStart: -1, dnsEnd: -1, connectStart: 10, connectEnd: 310 },
      },
    });
    emit(...(finished("1", 10) as [string, unknown]));
    expect(read()[0]?.setupMs).toBe(300);
  });

  it("drops a request still in flight when the page is read", () => {
    const { session, emit } = fakeSession();
    const read = recordNetwork(session);
    emit(...(sent("1", "https://app.example/slow.js") as [string, unknown]));
    expect(read()).toEqual([]);
  });
});

describe("isWireScheme", () => {
  it("counts only what crossed a network", () => {
    expect(isWireScheme("https://a.example/x")).toBe(true);
    expect(isWireScheme("http://a.example/x")).toBe(true);
    expect(isWireScheme("data:text/css,body{}")).toBe(false);
    expect(isWireScheme("blob:abc")).toBe(false);
  });
});

describe("wireTotals", () => {
  const request = (over: Partial<WireRequest> & { url: string }): WireRequest => ({
    bytes: 0,
    type: "Script",
    fromCache: false,
    failed: false,
    setupMs: 0,
    ...over,
  });
  const requests = [
    request({ url: "https://app.example/", bytes: 4000, type: "Document" }),
    request({ url: "https://app.example/page.js", bytes: 130_000 }),
    request({ url: "https://cdn.vendor.example/sdk.js", bytes: 200_000 }),
    request({ url: "https://vendor.example/config", bytes: 5000 }),
    request({ url: "https://other.example/pixel.gif", bytes: 40 }),
    request({ url: "https://blocked.example/x.js", bytes: 0, failed: true }),
    request({ url: "data:text/css,body{}", bytes: 0 }),
  ];
  const isVendor = (url: string) => url.includes("vendor.example");

  it("totals every completed http(s) request, the document included", () => {
    const totals = wireTotals(requests, "https://app.example", isVendor);
    expect(totals.wireBytes).toBe(339_040);
    expect(totals.wireRequests).toBe(5);
  });

  it("separates what came from somewhere other than the page's own origin", () => {
    expect(wireTotals(requests, "https://app.example", isVendor).wireThirdPartyBytes).toBe(205_040);
  });

  it("attributes the vendor's own hosts", () => {
    const totals = wireTotals(requests, "https://app.example", isVendor);
    expect(totals.wireVendorBytes).toBe(205_000);
    expect(totals.wireVendorRequests).toBe(2);
  });

  it("counts each third-party host once, however many requests it served", () => {
    // app.example is the page; vendor.example, cdn.vendor.example and
    // other.example are three distinct hosts — the failed and data: entries
    // contacted nobody.
    expect(wireTotals(requests, "https://app.example", isVendor).wireThirdPartyOrigins).toBe(3);
  });

  it("sums connection setup on third-party hosts only", () => {
    const withSetup = [
      request({ url: "https://app.example/", setupMs: 400 }),
      request({ url: "https://cdn.vendor.example/a.js", setupMs: 450 }),
      request({ url: "https://cdn.vendor.example/b.js", setupMs: 0 }),
      request({ url: "https://other.example/c.js", setupMs: 300 }),
    ];
    expect(wireTotals(withSetup, "https://app.example", isVendor).wireThirdPartySetupMs).toBe(750);
  });

  it("excludes failed requests from every total", () => {
    const totals = wireTotals(
      [request({ url: "https://a.example/x.js", bytes: 999, failed: true })],
      "https://app.example",
      isVendor,
    );
    expect(totals).toEqual({
      wireBytes: 0,
      wireRequests: 0,
      wireThirdPartyBytes: 0,
      wireVendorBytes: 0,
      wireVendorRequests: 0,
      wireThirdPartyOrigins: 0,
      wireThirdPartySetupMs: 0,
    });
  });
});
