export const SITE_URL = "https://cookiebannerbench.com";
export const SITE_NAME = "Cookiebannerbench";
export const GITHUB_URL = "https://github.com/cookieyes/cookiebannerbench";
export const DISCLOSURE =
  "Published by CookieYes, which appears in these results. Anchors, weights, run conditions and every measurement are on the page so the comparison can be checked rather than trusted.";
export const DEFAULT_PROFILE = "throttled-mobile";
export const DEFAULT_CACHE = "cold";
export const DEFAULT_PERCENTILE = "p75" as const;
export const DEFAULT_SLICE = {
  profile: DEFAULT_PROFILE,
  cache: DEFAULT_CACHE,
  percentile: DEFAULT_PERCENTILE,
};

// ---------------------------------------------------------------------------
// Legal identity, used by /privacy/. Kept here so the details a reviewer will
// want to change are in one place rather than inline in the page.
// ---------------------------------------------------------------------------
export const LEGAL = {
  entity: "CookieYes Limited",
  address: "3 Warren Yard Warren Park, Wolverton Mill, Milton Keynes, MK12 5NW, United Kingdom",
  email: "support@cookieyes.com",
  euRepresentative: "Euverify Ltd, Cork, Ireland",
  /** The representative's postal address, one line per line as it is printed. */
  euRepresentativeAddress: [
    "Euverify Ltd (Ireland)",
    "Unit 3D North Point House",
    "North Point Business Park",
    "New Mallow Road",
    "Cork",
    "T23 AT2P",
    "Ireland",
  ],
  euRepresentativeEmail: "gdpr@euverify.com",
  /** Where a data subject verifies the representative and files a request. */
  euRepresentativePortal: "https://gdpr.euverify.com/verify/2ea0ee81-7313-46b6-ae78-80863e25f8d6",
  /** Hosting provider that processes request and server-log data. */
  host: "Vercel Inc.",
  supervisoryAuthority: "Information Commissioner's Office (ICO)",
  supervisoryAuthorityUrl: "https://ico.org.uk/make-a-complaint/",
  /** The UK authority's postal address, as printed in the policy. */
  supervisoryAuthorityAddress: [
    "The Information Commissioner's Office,",
    "Wycliffe House, Water Lane,",
    "Wilmslow, Cheshire,",
    "SK9 5AF,",
    "England.",
  ],
  lastUpdated: "23 September 2026",
} as const;
