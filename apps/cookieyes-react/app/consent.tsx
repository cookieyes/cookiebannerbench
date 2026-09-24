"use client";

import "@cookieyes/react/styles.css";

import { CookieBanner, CookiePreferences, initCookieYes, RecallButton } from "@cookieyes/react";

/**
 * @cookieyes/nextjs is this package re-exported with "use client" applied, so
 * the directive is added by hand here. This app exists to show what the Next
 * adapter's server-rendered stylesheet is worth.
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
      <RecallButton />
    </>
  );
}
