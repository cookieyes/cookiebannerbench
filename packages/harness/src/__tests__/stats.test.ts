import { describe, expect, it } from "vitest";
import { bootstrapCI, isSeparated, percentile } from "../stats.js";

describe("percentile", () => {
  it("interpolates between neighbouring values", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it("returns the single value for a one-element sample", () => {
    expect(percentile([7], 0.95)).toBe(7);
  });

  it("does not mutate the caller's array", () => {
    const values = [3, 1, 2];
    percentile(values, 0.5);
    expect(values).toEqual([3, 1, 2]);
  });

  it("rejects an empty sample rather than returning NaN", () => {
    expect(() => percentile([], 0.5)).toThrow(/at least one value/);
  });
});

describe("bootstrapCI", () => {
  const values = Array.from({ length: 50 }, (_, index) => index);

  it("is deterministic for a given seed", () => {
    expect(bootstrapCI(values, 0.75)).toEqual(bootstrapCI(values, 0.75));
  });

  it("brackets the point estimate", () => {
    const ci = bootstrapCI(values, 0.75);
    expect(ci.lower).toBeLessThanOrEqual(ci.point);
    expect(ci.upper).toBeGreaterThanOrEqual(ci.point);
  });

  it("collapses to a point for a constant sample", () => {
    const ci = bootstrapCI([5, 5, 5, 5], 0.5);
    expect(ci).toEqual({ point: 5, lower: 5, upper: 5 });
  });

  it("narrows as the sample grows", () => {
    // Same distribution, three times the data: the interval must tighten.
    const small = bootstrapCI(values, 0.5);
    const large = bootstrapCI([...values, ...values, ...values], 0.5);
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower);
  });
});

describe("isSeparated", () => {
  it("is false when the intervals overlap", () => {
    expect(isSeparated({ point: 1, lower: 0, upper: 2 }, { point: 2, lower: 1, upper: 3 })).toBe(
      false,
    );
  });

  it("is true when they do not", () => {
    expect(isSeparated({ point: 1, lower: 0, upper: 1 }, { point: 5, lower: 4, upper: 6 })).toBe(
      true,
    );
  });
});
