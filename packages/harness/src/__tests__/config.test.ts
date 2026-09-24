import { describe, expect, it } from "vitest";
import { parseAppConfig, parseTargets } from "../config.js";

describe("parseAppConfig", () => {
  const valid = JSON.stringify({
    name: "matched-c15t",
    label: "c15t (matched, offline)",
    vendor: "c15t",
    bannerSelectors: ['[data-testid="consent-banner-root"]'],
  });

  it("defaults the optional arrays", () => {
    const config = parseAppConfig(valid, "test");
    expect(config.serviceHosts).toEqual([]);
    expect(config.tags).toEqual([]);
  });

  it("names the file in the error so a bad config is findable", () => {
    expect(() => parseAppConfig("{}", "apps/foo/consentbench.json")).toThrow(
      /apps\/foo\/consentbench\.json: "name" is required/,
    );
  });

  it("rejects a non-string selector list", () => {
    const raw = JSON.stringify({ name: "a", label: "A", vendor: "v", bannerSelectors: [1] });
    expect(() => parseAppConfig(raw, "test")).toThrow(/array of strings/);
  });
});

describe("parseTargets", () => {
  it("defaults unknown provenance rather than dropping the target", () => {
    const raw = JSON.stringify({ baseline: { url: "https://example.com" } });
    expect(parseTargets(raw, "test").baseline).toEqual({
      url: "https://example.com",
      version: "unknown",
      deployedAt: "unknown",
    });
  });

  it("rejects http, which would change TLS and HTTP/2 timings", () => {
    const raw = JSON.stringify({ baseline: { url: "http://example.com" } });
    expect(() => parseTargets(raw, "test")).toThrow(/must be https/);
  });
});
