/**
 * Network attribution: which bytes the consent vendor pulled, and what kind of
 * resource the page's bytes went on.
 *
 * These run in Node rather than inside the page so they can be unit tested. The
 * page hands back one flat record per resource-timing entry and nothing else;
 * every rule about what counts as the vendor's, and what counts as a script or
 * a font, lives here where it is readable and checkable.
 */

/** One resource-timing entry, flattened to what attribution needs. */
export interface ResourceEntry {
  /** The resource URL, as Resource Timing reports it. */
  name: string;
  /** transferSize, falling back to encodedBodySize. 0 when the host hides it. */
  size: number;
  initiatorType: string;
  /** Total fetch duration, ms. */
  duration: number;
  /** DNS lookup time, ms. 0 when cached or not exposed. */
  dnsMs: number;
  /** Connection time including TLS, ms. 0 when reused, cached or not exposed. */
  connectMs: number;
}

/**
 * Whether a resource came from one of the vendor's declared hosts.
 *
 * Matched on the URL's host and its parent domains, so a declared `example.com`
 * matches `cdn.example.com` but never `notexample.com` — a suffix test without
 * the dot would match the latter, which would attribute an unrelated host's
 * bytes to the vendor.
 *
 * An empty host list means the installation declares no vendor origin, which is
 * a claim the measurement then either confirms or contradicts. It never means
 * "match anything".
 */
export function isVendorResource(url: string, serviceHosts: readonly string[]): boolean {
  if (serviceHosts.length === 0) return false;
  let host: string;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    // A relative or opaque URL (`data:`, `blob:`) is never a vendor host.
    return false;
  }
  return serviceHosts.some((declared) => {
    const want = declared.trim().toLowerCase().replace(/^\./, "");
    if (!want) return false;
    return host === want || host.endsWith(`.${want}`);
  });
}

export interface VendorTotals {
  vendorBytes: number;
  vendorRequests: number;
  vendorConnectMs: number;
}

/**
 * What the vendor's own hosts cost.
 *
 * `vendorBytes` can be 0 while `vendorRequests` is not: a cross-origin host
 * that does not send `Timing-Allow-Origin` hides its sizes. That pair is how
 * the site tells "this vendor transferred nothing" from "this vendor would not
 * say", and the second must never be scored as the first.
 */
export function vendorTotals(
  resources: readonly ResourceEntry[],
  serviceHosts: readonly string[],
): VendorTotals {
  const vendor = resources.filter((entry) => isVendorResource(entry.name, serviceHosts));
  return {
    vendorBytes: vendor.reduce((total, entry) => total + entry.size, 0),
    vendorRequests: vendor.length,
    vendorConnectMs: vendor.reduce(
      (total, entry) => total + Math.max(0, entry.dnsMs) + Math.max(0, entry.connectMs),
      0,
    ),
  };
}

export interface KindTotals {
  bytesScript: number;
  bytesStyle: number;
  bytesFont: number;
  bytesImage: number;
  bytesOther: number;
}

/**
 * Bytes by resource kind. `initiatorType` is what the browser reports, and it
 * varies — a stylesheet arrives as `css` or `link` depending on how it was
 * requested, an image as `img` or `imageset` — so each bucket takes a set.
 *
 * `bytesOther` is the remainder rather than its own sum, so the five buckets
 * always add to `transferBytes`. A split that does not add up invites the
 * reader to work out which bucket is lying.
 */
export function kindTotals(resources: readonly ResourceEntry[], transferBytes: number): KindTotals {
  const sum = (kinds: readonly string[]) =>
    resources
      .filter((entry) => kinds.includes(entry.initiatorType))
      .reduce((total, entry) => total + entry.size, 0);
  const bytesScript = sum(["script"]);
  const bytesStyle = sum(["css", "link"]);
  const bytesFont = sum(["font"]);
  const bytesImage = sum(["img", "image", "imageset"]);
  return {
    bytesScript,
    bytesStyle,
    bytesFont,
    bytesImage,
    bytesOther: Math.max(0, transferBytes - bytesScript - bytesStyle - bytesFont - bytesImage),
  };
}
