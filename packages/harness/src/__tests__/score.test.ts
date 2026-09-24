import { describe, expect, it } from "vitest";
import { scoreSlice } from "../score.js";
import type { CI, MetricSummary, Summary } from "../types.js";

const ci = (point: number): CI => ({ point, lower: point, upper: point });
const summary = (point: number): MetricSummary => ({
  n: 20,
  p50: ci(point),
  p75: ci(point),
  p95: ci(point),
});

function slice(overrides: Record<string, number | undefined> = {}): Summary {
  const base: Record<string, number | undefined> = {
    fcp: 30,
    lcp: 60,
    cls: 0,
    tti: 1090,
    tbt: 0,
    transferBytes: 40 * 1024,
    requestCount: 6,
    thirdPartyBytes: 0,
    scriptLoadMs: 20,
    bannerVisible: 90,
    bannerLayoutShift: 0,
    bannerViewportCoverage: 0.12,
    ...overrides,
  };
  const metrics: Record<string, MetricSummary> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined) {
      metrics[k] = summary(v);
    }
  }
  return { "app|fast-desktop|cold": metrics } as Summary;
}

describe("scoreSlice", () => {
  it("scores a banner-rendering SDK on all three measured categories", () => {
    const card = scoreSlice(slice(), "app|fast-desktop|cold");
    expect(card?.measured.map((c) => c.name)).toEqual([
      "Performance",
      "Network Impact",
      "User Experience",
    ]);
  });

  it("gives a missing banner zero, not full marks", () => {
    // Upstream's `|| 0` turns a missing banner into 0ms and awards 35/35.
    const card = scoreSlice(slice({ bannerVisible: undefined }), "app|fast-desktop|cold");
    const ux = card?.measured.find((c) => c.name === "User Experience");
    const render = ux?.details.find((d) => d.name === "Banner Render Time");
    const coverage = ux?.details.find((d) => d.name === "Viewport Coverage");
    expect(render?.score).toBe(0);
    expect(render?.reason).toBe("No banner rendered");
    expect(coverage?.score).toBe(0);
  });

  it("still scores a rendered banner on its actual timing", () => {
    const fast = scoreSlice(slice({ bannerVisible: 20 }), "app|fast-desktop|cold");
    const slow = scoreSlice(slice({ bannerVisible: 400 }), "app|fast-desktop|cold");
    const render = (c: typeof fast) =>
      c?.measured
        .find((x) => x.name === "User Experience")
        ?.details.find((d) => d.name === "Banner Render Time")?.score;
    expect(render(fast)).toBe(35);
    expect(render(slow)).toBe(5);
  });

  it("holds the two declared categories at 100 so totals compare with upstream", () => {
    const card = scoreSlice(slice(), "app|fast-desktop|cold");
    const measuredWeighted = card?.measured.reduce((s, c) => s + c.score * c.weight, 0) ?? 0;
    expect(card?.total).toBe(Math.round(measuredWeighted + 35));
  });

  it("returns null for a slice the run has no data for", () => {
    expect(scoreSlice(slice(), "missing|fast-desktop|cold")).toBeNull();
  });
});
