import { describe, expect, it } from "vitest";
import { loadRun, runIds } from "@/data/source";
import { DEFAULT_SLICE } from "@/lib/config";
import { formatMetric, parts } from "@/lib/metrics";
import { buildRows } from "@/lib/ranking";
import {
  ANCHORS,
  BANDS,
  bandOf,
  CURRENT_METHOD,
  INPUTS,
  methodForRun,
  roundScore,
  scoreInstallation,
} from "@/lib/scoring";

/** A no-SDK control with every figure the current method reads. */
const control = {
  transferBytes: 137560,
  requestCount: 5,
  cls: 0,
  tbt: 150,
  fcp: 400,
  lcp: 400,
  wireBytes: 141_800,
  wireRequests: 6,
  wireThirdPartyOrigins: 0,
};

/** An installation that costs nothing at all: the best possible row. */
const free = {
  ...control,
  bannerVisible: 0,
  bannerInteractive: 0,
  bannerViewportCoverage: 0,
};

/** Metric score by id, wherever it sits. */
const metricOf = (s: ReturnType<typeof scoreInstallation>, id: string) =>
  s.categories.flatMap((c) => c.metrics).find((m) => m.id === id);

describe("scoring model", () => {
  it("weights sum to one, and every category's shares sum to one", () => {
    expect(INPUTS.reduce((sum, c) => sum + c.weight, 0)).toBeCloseTo(1);
    for (const c of INPUTS) expect(c.metrics.reduce((sum, m) => sum + m.share, 0)).toBeCloseTo(1);
  });

  it("scores every measurement exactly once", () => {
    // cookiebench scores layout shift in two categories. Nothing here may
    // appear twice, or the weights printed beside it would be false.
    const ids = INPUTS.flatMap((c) => c.metrics.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is on method 2 by default, with four categories at 30/25/25/20", () => {
    expect(CURRENT_METHOD).toBe(2);
    expect(INPUTS.map((c) => [c.id, c.weight])).toEqual([
      ["speed", 0.3],
      ["page", 0.25],
      ["network", 0.25],
      ["experience", 0.2],
    ]);
  });

  it("reports third-party hosts without scoring them", () => {
    // Withdrawn before publication: a proxy for "loaded from a CDN", whose
    // real costs are already scored as time, bytes and requests.
    expect(INPUTS.flatMap((c) => c.metrics.map((m) => m.id))).not.toContain("origins");
  });

  it("scores 100 at zero cost and 0 at every anchor", () => {
    const perfect = scoreInstallation(free, {}, control, false);
    expect(perfect.overall).toBe(100);
    expect(perfect.provisional).toBe(false);
    const worst = scoreInstallation(
      {
        ...control,
        bannerVisible: ANCHORS.bannerV2,
        bannerInteractive: ANCHORS.bannerV2 + ANCHORS.inert,
        fcp: control.fcp + ANCHORS.fcp,
        tbt: control.tbt + ANCHORS.tbt,
        wireBytes: control.wireBytes + ANCHORS.bytes,
        wireRequests: control.wireRequests + ANCHORS.requests,
        wireThirdPartyOrigins: ANCHORS.origins,
        bannerViewportCoverage: ANCHORS.coverage,
      },
      {},
      control,
      false,
    );
    expect(worst.overall).toBe(0);
  });

  it("is linear: half an anchor costs half the points", () => {
    const s = scoreInstallation(
      { ...free, fcp: control.fcp + ANCHORS.fcp / 2 },
      {},
      control,
      false,
    );
    expect(metricOf(s, "fcp")?.score).toBeCloseTo(50);
  });

  it("charges the host-affected measurements only for what they add over the control", () => {
    // A faster-than-control first paint is noise, not a bonus above 100.
    const s = scoreInstallation({ ...free, fcp: control.fcp - 50 }, {}, control, false);
    expect(metricOf(s, "fcp")?.cost).toBe(0);
    expect(metricOf(s, "fcp")?.score).toBe(100);
  });

  it("splits the wait between Banner Speed and the inert window, and counts no millisecond twice", () => {
    const s = scoreInstallation(
      { ...free, bannerVisible: 2000, bannerInteractive: 2400 },
      {},
      control,
      false,
    );
    expect(metricOf(s, "banner")?.cost).toBe(2000);
    expect(metricOf(s, "inert")?.cost).toBe(400);
  });

  it("weights subcategories by their share, not equally", () => {
    // Coverage 60 %, inert 40 %. Coverage at its anchor alone must cost
    // exactly 60 % of Visitor Experience.
    const s = scoreInstallation(
      { ...free, bannerViewportCoverage: ANCHORS.coverage },
      {},
      control,
      false,
    );
    expect(s.categories.find((c) => c.id === "experience")?.score).toBeCloseTo(40);
  });

  it("renormalises over what was measured, never filling a gap with zero or with a hundred", () => {
    // A run from before the hit-testing probe: no inert window. Visitor
    // Experience is scored over coverage alone, and says so.
    const { bannerInteractive: _, ...withoutProbe } = free;
    const s = scoreInstallation(
      { ...withoutProbe, bannerViewportCoverage: ANCHORS.coverage / 2 },
      {},
      control,
      false,
    );
    const experience = s.categories.find((c) => c.id === "experience");
    expect(metricOf(s, "inert")?.measured).toBe(false);
    expect(experience?.partial).toBe(true);
    // Coverage alone at half its anchor: 50, not (0.6 × 50 + 0.4 × 100).
    expect(experience?.score).toBeCloseTo(50);
    expect(s.provisional).toBe(true);
  });

  it("does not score accessibility — it is out of scope, not a free hundred", () => {
    expect(INPUTS.flatMap((c) => c.metrics.map((m) => m.id))).not.toContain("a11y");
  });

  it("falls back to the page's byte view when no wire count was recorded, and treats hidden cross-origin bytes there as unmeasured", () => {
    const { wireBytes: _w, wireRequests: _r, wireThirdPartyOrigins: _o, ...pageOnly } = control;
    const s = scoreInstallation(
      {
        ...pageOnly,
        bannerVisible: 1000,
        requestCount: 12,
        thirdPartyBytes: 0,
        bannerViewportCoverage: 0.1,
      },
      {},
      pageOnly,
      false,
    );
    expect(metricOf(s, "bytes")?.measured).toBe(false);
    expect(metricOf(s, "bytes")?.note).toMatch(/not exposed/);
    expect(s.provisional).toBe(true);
  });

  it("prefers the protocol's byte count, so a vendor that hides its sizes is still charged", () => {
    const s = scoreInstallation(
      {
        ...free,
        transferBytes: 137560,
        thirdPartyBytes: 0,
        wireBytes: control.wireBytes + 205 * 1024,
      },
      {},
      control,
      false,
    );
    expect(metricOf(s, "bytes")?.measured).toBe(true);
    expect(metricOf(s, "bytes")?.cost).toBe(205 * 1024);
    expect(metricOf(s, "bytes")?.score).toBeCloseTo(100 * (1 - 205 / 250));
  });

  it("treats zero wire bytes as a recording that did not happen, not as a free page", () => {
    const s = scoreInstallation({ ...free, wireBytes: 0 }, {}, control, false);
    // Falls back to the page view (137560 − 137560 = 0 over the control).
    expect(metricOf(s, "bytes")?.note).toMatch(/as the page reported it/);
  });

  it("never scores the control, and never scores a condition with no banner", () => {
    expect(scoreInstallation(control, {}, control, true).overall).toBeNull();
    const { bannerVisible: _, ...noBanner } = free;
    const s = scoreInstallation(noBanner, {}, control, false);
    expect(s.overall).toBeNull();
    expect(s.provisional).toBe(false);
    // And a banner property is unmeasured whenever the banner is.
    expect(metricOf(s, "coverage")?.measured).toBe(false);
    expect(metricOf(s, "inert")?.measured).toBe(false);
  });

  it("still reproduces method 1 exactly, so a published score can be re-derived", () => {
    const values = { ...free, bannerVisible: 1250, tbt: control.tbt + 300, cls: 0 };
    const s = scoreInstallation(values, {}, control, false, 1);
    expect(s.categories.map((c) => c.id)).toEqual(["banner", "bytes", "coverage", "stability"]);
    // Time to banner 50 at a 2.5 s anchor; bytes: wire delta 0 → 100;
    // coverage 0 → 100; stability mean(100, 50) = 75.
    expect(s.overall).toBeCloseTo(0.3 * 50 + 0.25 * 100 + 0.25 * 100 + 0.2 * 75);
  });

  it("bands are fixed at 80 and 60, inclusive at the lower end", () => {
    expect(bandOf(80)).toBe("good");
    expect(bandOf(79)).toBe("fair");
    expect(bandOf(60)).toBe("fair");
    expect(bandOf(59)).toBe("poor");
    expect(BANDS).toEqual({ good: 80, fair: 60 });
  });
});

describe("ranking", () => {
  const run = loadRun();
  const rows = buildRows(run, DEFAULT_SLICE);
  it("sorts by score, control last and unranked", () => {
    const scored = rows.filter((r) => !r.control);
    // Sorted and ranked on the published, rounded score, so a tie shares a rank.
    const shown = (r: (typeof scored)[number] | undefined) =>
      r?.scores.overall == null ? -1 : roundScore(r.scores.overall);
    for (let i = 1; i < scored.length; i++) {
      expect(shown(scored[i - 1])).toBeGreaterThanOrEqual(shown(scored[i]));
      if (shown(scored[i - 1]) === shown(scored[i]))
        expect(scored[i]?.rank).toBe(scored[i - 1]?.rank);
    }
    expect(rows.at(-1)?.control).toBe(true);
    expect(rows.at(-1)?.rank).toBeNull();
    expect(scored[0]?.rank).toBe(1);
  });
  it("charges every installation for its bytes once the run recorded them over the wire", () => {
    // Before the protocol recorder, the five vendor-CDN installations were all
    // provisional: their hosts withhold Timing-Allow-Origin, so the page saw no
    // bytes and only the installations that disclose could be charged. A run
    // that carries wireBytes must not reproduce that, and a run that predates
    // it must still score exactly as it did.
    const recorded = rows.some((r) => (r.values.wireBytes ?? 0) > 0);
    for (const r of rows.filter((r) => !r.control)) {
      const bytes = r.scores.categories.flatMap((c) => c.metrics).find((m) => m.id === "bytes");
      if (recorded) expect(bytes?.measured).toBe(true);
      else if (r.installModel === "vendor-cdn") expect(bytes?.measured).toBe(false);
    }
  });
  it("computes a change against the previous run when one exists", () => {
    const ids = runIds();
    const previous = ids.length > 1 ? loadRun(ids[ids.length - 2]) : undefined;
    const withChange = buildRows(run, DEFAULT_SLICE, previous);
    // The 2026-09-14 run has no control, so nothing in it is scored and no
    // change can be shown — a dash, never a delta against an invented number.
    // A change is shown only between runs scored under the same method.
    const priorScored =
      previous && methodForRun(previous.startedAt) === methodForRun(run.startedAt)
        ? buildRows(previous, DEFAULT_SLICE).some((r) => r.scores.overall !== null)
        : false;
    if (priorScored) expect(withChange.some((r) => r.change !== null)).toBe(true);
    else for (const r of withChange) expect(r.change).toBeNull();
  });
  it("rounds once and derives the band from the rounded score", () => {
    for (const r of rows)
      if (r.scores.overall !== null)
        expect(r.scores.band).toBe(bandOf(roundScore(r.scores.overall)));
  });
});

describe("formatting", () => {
  it("follows the published rules", () => {
    expect(parts(89, "ms")).toEqual({ value: "89", unit: "ms" });
    expect(parts(1500, "ms")).toEqual({ value: "1.5", unit: "s" });
    expect(parts(0, "bytes")).toEqual({ value: "0", unit: "B" });
    expect(parts(168, "bytes")).toEqual({ value: "168", unit: "B" });
    expect(parts(1024, "bytes")).toEqual({ value: "1.0", unit: "KB" });
    expect(parts(0.125, "percent")).toEqual({ value: "12.5", unit: "%" });
    expect(parts(0, "percent")).toEqual({ value: "0.0", unit: "%" });
    expect(parts(0.0012, "shift")).toEqual({ value: "0.001", unit: "" });
    expect(parts(null, "ms")).toEqual({ value: "—", unit: "" });
    expect(formatMetric(2718, "ms")).toBe("2.7 s");
  });
});
