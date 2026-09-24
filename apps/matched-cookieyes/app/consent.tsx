"use client";

import "@cookieyes/nextjs/styles.css";

import { CookieBanner, CookiePreferences, initCookieYes } from "@cookieyes/nextjs";

/**
 * Matched against matched-c15t. Both are offline, both render exactly two
 * surfaces (banner + preferences), and neither uses a server-rendered
 * stylesheet — c15t has no equivalent of <CookieYesStyles />, so using it here
 * would be measuring a feature the other side cannot have.
 *
 * RecallButton is dropped for the same reason. See cookieyes-nextjs for the
 * unmatched, as-documented integration.
 */
initCookieYes({
  mode: "cookie-only",
  regulation: "GDPR",
  colorScheme: "system",
});

export function Consent() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
    </>
  );
}
