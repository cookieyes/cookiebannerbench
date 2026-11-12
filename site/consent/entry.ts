/**
 * Bundled to out/consent.js by scripts/build-consent.mjs. The site has no
 * hydration runtime, so the banner is @cookieyes/vanilla rather than the React
 * package: the layout puts the banner HTML in the page at build time and this
 * takes it over.
 *
 * Both tags are gated on the Analytics category. GA4 runs in Consent Mode
 * "basic", so gtag.js is not on the page until consent and is removed on
 * withdrawal; Clarity loads only after consent. The deny-by-default is the
 * inline snippet in <head>.
 */
import { clarity, ga4 } from "@cookieyes/scripts";
import { start } from "@cookieyes/vanilla";
import { CONSENT_CONFIG } from "./config";

// The full stylesheet (dialogs, recall button). The banner's own rules are
// already inline in <head>, so this is not render-blocking.
const css = document.createElement("link");
css.rel = "stylesheet";
css.href = "/consent.css";
document.head.appendChild(css);

start({
  ...CONSENT_CONFIG,
  integrations: [
    ga4({ measurementId: "G-KBJVQM960J", consentMode: "basic" }),
    clarity({ projectId: "ymnkuq01qi" }),
  ],
});
