"use client";

// The control for <CookieYesStyles />: the same stylesheet, but pulled in as an
// ordinary import so Next serves it as a render-blocking <link> instead of
// inlining the critical rules into the first response.
import "@cookieyes/nextjs/styles.css";

import { CookieBanner, CookiePreferences, initCookieYes, RecallButton } from "@cookieyes/nextjs";

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
