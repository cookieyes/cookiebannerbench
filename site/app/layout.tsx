import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_NAME, SITE_URL } from "@/lib/config";
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
  // Kept out of search engines for now. robots.txt still allows crawling, so
  // crawlers can fetch the pages and see this tag.
  robots: { index: false, follow: false },
};

// GA4 and Microsoft Clarity. The inline part only queues commands; the two tags
// are created here with data-cookieyes set before src, so CookieYes holds them
// until the visitor allows the Analytics category, on every page load. Being
// created by script, they are also invisible to the browser's preloader, so
// nothing is fetched from Google or Clarity before consent.
const analyticsScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-KBJVQM960J');
window.clarity = window.clarity || function(){(window.clarity.q = window.clarity.q || []).push(arguments)};
['https://www.googletagmanager.com/gtag/js?id=G-KBJVQM960J', 'https://www.clarity.ms/tag/ymnkuq01qi'].forEach(function (src) {
  var s = document.createElement('script');
  s.setAttribute('data-cookieyes', 'cookieyes-analytics');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
});`;

// Google Consent Mode v2 defaults. Must run before the CookieYes script, which
// updates these once the visitor makes a choice.
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
gtag("set", "ads_data_redaction", true);
gtag("set", "url_passthrough", true);`;

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
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant Consent Mode defaults. */}
            <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
            {/* Start cookieyes banner */}
            <script
              id="cookieyes"
              type="text/javascript"
              src="https://cdn-cookieyes.com/client_data/bd4f5728c291fc3c702303b1bdfa3f6c/script.js"
            />
            {/* End cookieyes banner */}
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant GA4 and Clarity loader. */}
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
