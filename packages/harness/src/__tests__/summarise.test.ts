import { describe, expect, it } from "vitest";
import { summarise } from "../summarise.js";
import type { Measurement } from "../types.js";

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    app: "matched-cookieyes",
    profile: "fast-desktop",
    cache: "cold",
    iteration: 1,
    at: "2026-09-11T00:00:00.000Z",
    fcp: 100,
    lcp: 200,
    cls: 0.01,
    tbt: 30,
    tti: 250,
    transferBytes: 50_000,
    bannerVisible: 150,
    bannerInteractive: 160,
    bannerLayoutShift: 0,
    bannerViewportCoverage: 0.2,
    ...overrides,
  };
}

describe("summarise", () => {
  it("keys each slice by app, profile and cache state", () => {
    const summary = summarise([measurement(), measurement({ cache: "warm" })]);
    expect(Object.keys(summary).sort()).toEqual([
      "matched-cookieyes|fast-desktop|cold",
      "matched-cookieyes|fast-desktop|warm",
    ]);
  });

  it("drops only the banner metric when a load rendered no banner", () => {
    const summary = summarise([
      measurement({ bannerVisible: 150 }),
      measurement({ bannerVisible: null }),
    ]);
    const slice = summary["matched-cookieyes|fast-desktop|cold"];
    expect(slice?.bannerVisible?.n).toBe(1);
    expect(slice?.lcp?.n).toBe(2);
  });

  it("omits a metric entirely when no load produced one", () => {
    const summary = summarise([measurement({ bannerVisible: null })]);
    expect(summary["matched-cookieyes|fast-desktop|cold"]?.bannerVisible).toBeUndefined();
  });
});
