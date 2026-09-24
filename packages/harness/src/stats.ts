import type { CI } from "./types.js";

/**
 * Linear-interpolated percentile, matching the `numpy.percentile` default.
 * Sorts a copy, so the caller's array is left alone.
 */
export function percentile(values: readonly number[], q: number): number {
  if (values.length === 0) {
    throw new Error("percentile() needs at least one value");
  }
  const xs = [...values].sort((a, b) => a - b);
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const loValue = xs[lo] ?? 0;
  if (lo === hi) {
    return loValue;
  }
  return loValue + ((xs[hi] ?? loValue) - loValue) * (pos - lo);
}

/**
 * Mulberry32 — a small, fast PRNG. Seeded so a given dataset always produces
 * the same confidence interval, which is what makes a published CI checkable.
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BootstrapOptions {
  /** Number of resamples. 1000 is the published default. */
  resamples?: number;
  seed?: number;
  /** Two-sided confidence level, e.g. 0.95. */
  confidence?: number;
}

/**
 * Percentile bootstrap confidence interval.
 *
 * Resamples the data with replacement `resamples` times, takes the percentile
 * of each resample, and reports the empirical interval of those percentiles.
 * This is what lets us say "p75 LCP got worse" rather than "p75 LCP moved" —
 * two runs whose intervals overlap have not been shown to differ.
 */
export function bootstrapCI(
  values: readonly number[],
  q: number,
  { resamples = 1000, seed = 42, confidence = 0.95 }: BootstrapOptions = {},
): CI {
  if (values.length === 0) {
    throw new Error("bootstrapCI() needs at least one value");
  }
  const random = createRng(seed);
  const distribution: number[] = [];
  const sample = new Array<number>(values.length);
  for (let i = 0; i < resamples; i++) {
    for (let j = 0; j < values.length; j++) {
      sample[j] = values[Math.floor(random() * values.length)] ?? 0;
    }
    distribution.push(percentile(sample, q));
  }
  const tail = (1 - confidence) / 2;
  return {
    point: percentile(values, q),
    lower: percentile(distribution, tail),
    upper: percentile(distribution, 1 - tail),
  };
}

/** True when two intervals do not overlap — i.e. the difference is resolvable. */
export function isSeparated(a: CI, b: CI): boolean {
  return a.upper < b.lower || b.upper < a.lower;
}
