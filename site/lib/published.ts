/**
 * The sole publication policy. Exclusion records are build/test-only.
 *
 * c15t appears twice on purpose. Its package documents two install modes, and
 * the hosted one resolves consent state over the network before it decides
 * whether to show a banner — worth about a second on throttled mobile. Both are
 * published, because measuring only the hosted install would overstate the
 * library's cost and measuring only the offline one would hide a cost real
 * users pay. CookieYes appears three times: two npm packages and the CDN
 * script. The CDN row exists because every competitor here is a CDN install,
 * and comparing our bundled package against their hosted script confounds the
 * product with the delivery method. The CDN row is the like-for-like one, and
 * it is the least flattering of the three.
 */
export type InstallModel = "self-hosted-npm" | "hosted-backend" | "vendor-cdn" | "control";
export interface PublishedTarget {
  app: string;
  displayName: string;
  vendor: string;
  /** As shown beside the name. For a mode of a package, the mode is part of it. */
  package: string | null;
  /** The npm package to link to, where the shown name is not one. */
  npmPackage?: string;
  installModel: InstallModel;
  vendorUrl: string | null;
  /** Stated in the row when the provider is affiliated with whoever publishes the site. */
  affiliation: string | null;
}
export const PUBLISHED: readonly PublishedTarget[] = [
  {
    app: "cookieyes-nextjs",
    displayName: "CookieYes",
    vendor: "cookieyes",
    package: "@cookieyes/nextjs",
    installModel: "self-hosted-npm",
    vendorUrl: "https://developers.cookieyes.com/",
    affiliation: "Publishes this site",
  },
  {
    app: "cookieyes-react",
    displayName: "CookieYes",
    vendor: "cookieyes",
    package: "@cookieyes/react",
    installModel: "self-hosted-npm",
    vendorUrl: "https://developers.cookieyes.com/",
    affiliation: "Publishes this site",
  },
  {
    app: "cookieyes-cdn",
    displayName: "CookieYes",
    vendor: "cookieyes",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.cookieyes.com",
    affiliation: "Publishes this site",
  },
  {
    app: "c15t-nextjs",
    displayName: "c15t",
    vendor: "c15t",
    package: "@c15t/nextjs",
    installModel: "hosted-backend",
    vendorUrl: "https://c15t.com",
    affiliation: null,
  },
  {
    app: "c15t-react",
    displayName: "c15t",
    vendor: "c15t",
    package: "@c15t/react",
    installModel: "hosted-backend",
    vendorUrl: "https://c15t.com",
    affiliation: null,
  },
  {
    app: "c15t-nextjs-offline",
    displayName: "c15t",
    vendor: "c15t",
    package: "@c15t/nextjs (offline mode)",
    npmPackage: "@c15t/nextjs",
    installModel: "self-hosted-npm",
    vendorUrl: "https://c15t.com",
    affiliation: null,
  },
  {
    app: "c15t-react-offline",
    displayName: "c15t",
    vendor: "c15t",
    package: "@c15t/react (offline mode)",
    npmPackage: "@c15t/react",
    installModel: "self-hosted-npm",
    vendorUrl: "https://c15t.com",
    affiliation: null,
  },
  {
    app: "onetrust",
    displayName: "OneTrust",
    vendor: "onetrust",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.onetrust.com",
    affiliation: null,
  },
  {
    app: "osano",
    displayName: "Osano",
    vendor: "osano",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.osano.com",
    affiliation: null,
  },
  {
    app: "iubenda",
    displayName: "Iubenda",
    vendor: "iubenda",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.iubenda.com",
    affiliation: null,
  },
  {
    app: "ketch",
    displayName: "Ketch",
    vendor: "ketch",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.ketch.com",
    affiliation: null,
  },
  {
    app: "enzuzo",
    displayName: "Enzuzo",
    vendor: "enzuzo",
    package: null,
    installModel: "vendor-cdn",
    vendorUrl: "https://www.enzuzo.com",
    affiliation: null,
  },
  {
    app: "baseline",
    displayName: "Baseline (no consent SDK)",
    vendor: "none",
    package: null,
    installModel: "control",
    vendorUrl: null,
    affiliation: null,
  },
];
/**
 * Published installations whose app is not yet deployed, so no run can contain
 * them. Named explicitly rather than tolerated silently: a published app the
 * run does not carry is either this — a row waiting on a deployment — or a
 * typo, and only one of those should pass a test.
 *
 * An entry here is removed the moment its target exists.
 */
export const AWAITING_DEPLOYMENT: readonly string[] = [];

export const REMOVED = [
  {
    app: "didomi",
    category: "invalid-banner-run",
    reason: "Banner never detected in the run.",
    aliases: ["didomi"],
  },
  {
    app: "usercentrics",
    category: "invalid-banner-run",
    reason: "Banner never detected in the run.",
    aliases: ["usercentrics"],
  },
  {
    app: "cookie-control",
    category: "invalid-banner-run",
    reason: "Test domain not licensed for normal vendor-script operation.",
    aliases: ["cookie-control", "Cookie Control", "/cmp/civic"],
  },
  {
    app: "cookieyes-core",
    category: "internal-variant",
    reason: "Headless package; renders no consent banner.",
    aliases: ["cookieyes-core", "@cookieyes/core"],
  },
  {
    app: "cookieyes-nextjs-no-critical-css",
    category: "internal-variant",
    reason: "CSS-delivery ablation, not a separate product.",
    aliases: ["cookieyes-nextjs-no-critical-css", "linked CSS"],
  },
  {
    app: "matched-cookieyes",
    category: "internal-variant",
    reason: "Internal pair control.",
    aliases: ["matched-cookieyes"],
  },
  {
    app: "matched-cookieyes-backend",
    category: "internal-variant",
    reason: "Internal pair control.",
    aliases: ["matched-cookieyes-backend"],
  },
  {
    app: "matched-c15t",
    category: "internal-variant",
    reason: "Internal pair control.",
    aliases: ["matched-c15t"],
  },
  {
    app: "matched-c15t-backend",
    category: "internal-variant",
    reason: "Internal pair control.",
    aliases: ["matched-c15t-backend"],
  },
] as const;
export function publishedTarget(app: string) {
  return PUBLISHED.find((entry) => entry.app === app);
}
const FRAMEWORK: Record<string, string> = { nextjs: "Next.js", react: "React" };
/**
 * One installation's name in words, unique across the published set: the
 * vendor, then the framework its package targets and any mode ("c15t Next.js
 * Offline"), or "CDN Script" where the vendor also ships a package.
 * Titles and headings use it; the npm name stays beside it as the identifier.
 */
export function installName(entry: PublishedTarget): string {
  if (entry.installModel === "control") return "No-SDK Baseline";
  if (entry.package) {
    // "@c15t/nextjs (offline mode)" → "c15t Next.js Offline", short enough for a title.
    const [name = "", mode] = entry.package.split(/ \((.+)\)$/);
    const slug = name.split("/").pop() ?? name;
    const suffix = mode?.replace(/ mode$/, "").replace(/^\w/, (c) => c.toUpperCase());
    return [entry.displayName, FRAMEWORK[slug] ?? slug, suffix].filter(Boolean).join(" ");
  }
  const siblings = PUBLISHED.filter((p) => p.vendor === entry.vendor);
  return siblings.length > 1 ? `${entry.displayName} CDN Script` : entry.displayName;
}
export const INCLUSION_RULE =
  "An installable consent product is published when its banner renders on the test domain and the vendor’s licensing permits that domain. A load in which no banner was detected is counted and shown on the row, never dropped quietly. Internal experimental variants are not published; the no-SDK baseline is shown separately as the control every cost is measured against.";
