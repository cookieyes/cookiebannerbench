import type { Metadata } from "next";
import localFont from "next/font/local";
import { INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

// Archivo for language and every measured value; a 400–600 instance of the
// variable file, Latin subset, 24 KB. Fallback metrics come from Arial.
const archivo = localFont({
  src: "./fonts/sans.woff2",
  variable: "--font-archivo",
  display: "swap",
  weight: "400 600",
  adjustFontFallback: "Arial",
});
// DM Mono for identifiers — slugs, versions, column labels, band words. Two
// static faces, Latin subset, ~9 KB each. A monospace fallback keeps the
// label boxes from moving at swap.
const dmMono = localFont({
  src: [
    { path: "./fonts/mono.woff2", weight: "400", style: "normal" },
    { path: "./fonts/mono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description:
    "What consent banners cost the pages they sit on: banner speed, page impact, network cost and visitor experience, measured on identical pages and scored against published anchors.",
  openGraph: { siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
  // Indexed, except on Vercel preview builds (lib/config.ts). robots.txt allows
  // crawling either way, so crawlers can fetch the pages and see this tag.
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
};

const COOKIEYES_SRC =
  "https://cdn-cookieyes.com/client_data/bd4f5728c291fc3c702303b1bdfa3f6c/script.js";

// CookieYes, then GA4 and Microsoft Clarity. CookieYes is inserted by script so
// it no longer blocks first paint, and the two analytics tags are created only
// from its load handler: CookieYes is always running before they exist, exactly
// as it was when it loaded synchronously ahead of this code. Each tag gets
// data-cookieyes before src, so CookieYes holds it until the visitor allows the
// Analytics category, on every page load. If CookieYes fails to load (blocked,
// offline), the tags are never created at all. The gtag and clarity calls
// below only queue commands; nothing is fetched from Google or Clarity here.
const analyticsScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-KBJVQM960J');
window.clarity = window.clarity || function(){(window.clarity.q = window.clarity.q || []).push(arguments)};
(function () {
  var cy = document.createElement('script');
  cy.id = 'cookieyes';
  cy.src = '${COOKIEYES_SRC}';
  cy.onload = function () {
    ['https://www.googletagmanager.com/gtag/js?id=G-KBJVQM960J', 'https://www.clarity.ms/tag/ymnkuq01qi'].forEach(function (src) {
      var s = document.createElement('script');
      s.setAttribute('data-cookieyes', 'cookieyes-analytics');
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    });
  };
  document.head.appendChild(cy);
})();`;

// Google Consent Mode v2 defaults. Must run before the CookieYes script, which
// updates these once the visitor makes a choice; it runs first, synchronously.
const consentDefaultsScript = `window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
  wait_for_update: 2000,
});
gtag("set", "ads_data_redaction", false);
gtag("set", "url_passthrough", false);`;

const themeScript =
  'try{var t=localStorage.getItem("cookiebannerbench-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant theme bootstrap, no interpolated input. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {process.env.ENABLE_ANALYTICS === "true" && (
          <>
            <link rel="preconnect" href="https://cdn-cookieyes.com" />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant Consent Mode defaults. */}
            <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant CookieYes, GA4 and Clarity loader. */}
            <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
          </>
        )}
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to the leaderboard
        </a>
        {children}
        <script src="/enhance.js" defer />
      </body>
    </html>
  );
}
