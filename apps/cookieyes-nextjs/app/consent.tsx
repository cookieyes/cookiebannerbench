"use client";

import { CookieBanner, CookiePreferences, initCookieYes, RecallButton } from "@cookieyes/nextjs";

/**
 * `cookie-only` mode keeps consent entirely in the browser — no account, no
 * backend, no CDN — which is what makes this app reproducible by anyone.
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
