"use client";

import "@cookieyes/nextjs/styles.css";

import { CookieBanner, CookiePreferences, initCookieYes } from "@cookieyes/nextjs";

/**
 * CookieYes in self-hosted mode, matched against matched-c15t-backend.
 *
 * Worth knowing when reading the numbers: the SDK POSTs to `apiUrl` only when
 * the visitor saves a choice. There is no fetch on load, so at first paint this
 * behaves like the offline app and the backend cost lands after the banner is
 * already interactive. c15t's backend mode fetches before deciding to render,
 * which is a different trade-off, not a slower version of the same one.
 */
initCookieYes({
  mode: "self-hosted",
  apiUrl: process.env.NEXT_PUBLIC_CONSENT_API_URL ?? "https://consent.example.com/v1/consent",
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
