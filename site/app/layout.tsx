import { readFileSync } from "node:fs";
import { join } from "node:path";
import { googleConsentModeSnippet } from "@cookieyes/scripts";
import { renderShell } from "@cookieyes/vanilla";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { CONSENT_CONFIG, CONSENT_COOKIE } from "@/consent/config";
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

const ANALYTICS = process.env.ENABLE_ANALYTICS === "true";

// The CookieYes banner (@cookieyes/vanilla), in the HTML at build time with its
// first-paint CSS inline, so it is on screen without waiting for any script.
// out/consent.js (consent/entry.ts) takes it over and loads GA4 and Clarity
// once the visitor allows Analytics. Local builds, CI audits and forks leave
// all of it out.
const bannerHtml = ANALYTICS ? renderShell(CONSENT_CONFIG) : "";
const bannerCss = ANALYTICS
  ? readFileSync(join(process.cwd(), "node_modules/@cookieyes/vanilla/dist/critical.css"), "utf8")
  : "";
// A static page cannot read the visitor's cookie, so the banner is in every
// page's HTML. For a visitor who has already chosen, hide it before first
// paint rather than show it until consent.js removes it on every page they open.
// The cookie value is URL-encoded, so decode it before looking for the choice.
const decidedScript = `try{var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(m&&/(?:^|,)action:yes(?:,|$)/.test(decodeURIComponent(m[1])))document.documentElement.setAttribute("data-cy-decided","")}catch(e){}`;
// The Consent Mode deny-by-default. @cookieyes/scripts 0.4.0's snippet does not
// set the flag its own runtime checks for, so without the second statement the
// SDK warns and pushes a second default. Remove it once the snippet sets it.
const consentModeScript = `${googleConsentModeSnippet()}window.__ckyGcmReady=true;`;
const decidedCss = "html[data-cy-decided] [data-cky-banner]{display:none}";

const themeScript =
  'try{var t=localStorage.getItem("cookiebannerbench-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant theme bootstrap, no interpolated input. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {ANALYTICS && (
          <>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant Consent Mode deny-by-default, ahead of any Google tag. */}
            <script dangerouslySetInnerHTML={{ __html: consentModeScript }} />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant returning-visitor check, no interpolated input. */}
            <script dangerouslySetInnerHTML={{ __html: decidedScript }} />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the SDK's first-paint banner CSS. */}
            <style dangerouslySetInnerHTML={{ __html: bannerCss + decidedCss }} />
          </>
        )}
      </head>
      <body>
        {ANALYTICS && (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the SDK's banner HTML, rendered at build time from constant config.
          <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: bannerHtml }} />
        )}
        <a href="#main" className="skip-link">
          Skip to the leaderboard
        </a>
        {children}
        {ANALYTICS && <script src="/consent.js" defer />}
        <script src="/enhance.js" defer />
      </body>
    </html>
  );
}
