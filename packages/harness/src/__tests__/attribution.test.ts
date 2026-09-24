import { describe, expect, it } from "vitest";
import { isVendorResource, kindTotals, type ResourceEntry, vendorTotals } from "../attribution.js";

const entry = (over: Partial<ResourceEntry> & { name: string }): ResourceEntry => ({
  size: 0,
  initiatorType: "script",
  duration: 0,
  dnsMs: 0,
  connectMs: 0,
  ...over,
});

describe("isVendorResource", () => {
  it("matches the declared host and its subdomains", () => {
    expect(isVendorResource("https://c15t.com/init", ["c15t.com"])).toBe(true);
    expect(isVendorResource("https://cdn.c15t.com/sdk.js", ["c15t.com"])).toBe(true);
    expect(isVendorResource("https://a.b.c15t.com/sdk.js", ["c15t.com"])).toBe(true);
  });

  // The bug this guards: a bare `endsWith` attributes an unrelated company's
  // bytes to the vendor, which would be a false accusation in a published table.
  it("does not match a host that merely ends with the same letters", () => {
    expect(isVendorResource("https://notc15t.com/x.js", ["c15t.com"])).toBe(false);
    expect(isVendorResource("https://evil-c15t.com/x.js", ["c15t.com"])).toBe(false);
  });

  it("is case-insensitive and tolerates a leading dot in config", () => {
    expect(isVendorResource("https://CDN.C15T.COM/s.js", ["c15t.com"])).toBe(true);
    expect(isVendorResource("https://cdn.c15t.com/s.js", [".c15t.com"])).toBe(true);
  });

  it("never matches when no hosts are declared", () => {
    expect(isVendorResource("https://anything.example/x.js", [])).toBe(false);
    expect(isVendorResource("https://anything.example/x.js", ["  "])).toBe(false);
  });

  it("does not throw on opaque or relative URLs", () => {
    expect(isVendorResource("data:text/css,body{}", ["c15t.com"])).toBe(false);
    expect(isVendorResource("/local.js", ["c15t.com"])).toBe(false);
    expect(isVendorResource("blob:abc", ["c15t.com"])).toBe(false);
  });
});

describe("vendorTotals", () => {
  const resources = [
    entry({ name: "https://app.example/page.js", size: 1000 }),
    entry({ name: "https://cdn.c15t.com/sdk.js", size: 400, dnsMs: 12, connectMs: 30 }),
    entry({ name: "https://c15t.com/init", size: 100, dnsMs: 0, connectMs: 5 }),
  ];

  it("sums only the vendor's own hosts", () => {
    expect(vendorTotals(resources, ["c15t.com"])).toEqual({
      vendorBytes: 500,
      vendorRequests: 2,
      vendorConnectMs: 47,
    });
  });

  it("reports zero for an installation that declares no vendor origin", () => {
    expect(vendorTotals(resources, [])).toEqual({
      vendorBytes: 0,
      vendorRequests: 0,
      vendorConnectMs: 0,
    });
  });

  // The distinction the score depends on: requests with no bytes means the host
  // hid its sizes, which is unmeasured, not free.
  it("keeps requests when a host hides its sizes", () => {
    const hidden = [entry({ name: "https://cdn.c15t.com/sdk.js", size: 0, connectMs: 8 })];
    expect(vendorTotals(hidden, ["c15t.com"])).toEqual({
      vendorBytes: 0,
      vendorRequests: 1,
      vendorConnectMs: 8,
    });
  });
});

describe("kindTotals", () => {
  const resources = [
    entry({ name: "a.js", initiatorType: "script", size: 500 }),
    entry({ name: "b.css", initiatorType: "css", size: 200 }),
    entry({ name: "c.css", initiatorType: "link", size: 50 }),
    entry({ name: "d.woff2", initiatorType: "font", size: 120 }),
    entry({ name: "e.png", initiatorType: "img", size: 80 }),
    entry({ name: "f.json", initiatorType: "fetch", size: 30 }),
  ];

  it("buckets by initiatorType, taking both spellings of styles and images", () => {
    const totals = kindTotals(resources, 980);
    expect(totals.bytesScript).toBe(500);
    expect(totals.bytesStyle).toBe(250);
    expect(totals.bytesFont).toBe(120);
    expect(totals.bytesImage).toBe(80);
    expect(totals.bytesOther).toBe(30);
  });

  it("always adds up to the transferred total", () => {
    const totals = kindTotals(resources, 980);
    const sum =
      totals.bytesScript +
      totals.bytesStyle +
      totals.bytesFont +
      totals.bytesImage +
      totals.bytesOther;
    expect(sum).toBe(980);
  });

  it("never reports a negative remainder when buckets exceed the total", () => {
    expect(kindTotals(resources, 100).bytesOther).toBe(0);
  });
});
