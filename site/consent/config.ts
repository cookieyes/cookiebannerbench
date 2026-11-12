import type { CookieYesConfig } from "@cookieyes/vanilla";

/**
 * The site's own banner configuration, shared by the build-time banner HTML
 * (renderShell in app/layout.tsx) and the browser start (consent/entry.ts), so
 * the banner in the page and the one the SDK takes over are the same banner.
 * `cookie-only` keeps consent in the visitor's browser: no account, no backend.
 */
export const CONSENT_CONFIG = {
  mode: "cookie-only",
  regulation: "GDPR",
  colorScheme: "system",
} satisfies CookieYesConfig;

/** The cookie the SDK records a choice in. */
export const CONSENT_COOKIE = "cookieyes-consent";
