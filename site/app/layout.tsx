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
};

const gtagScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-KBJVQM960J');
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=G-KBJVQM960J';
document.head.appendChild(s);`;
const clarityScript = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "ymnkuq01qi");`;

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
            {/* Start cookieyes banner */}
            <script
              id="cookieyes"
              type="text/javascript"
              src="https://cdn-cookieyes.com/client_data/bd4f5728c291fc3c702303b1bdfa3f6c/script.js"
            />
            {/* End cookieyes banner */}
            {/* Google tag (gtag.js), loaded from the snippet so it stays after CookieYes */}
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant GA4 snippet. */}
            <script dangerouslySetInnerHTML={{ __html: gtagScript }} />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant Microsoft Clarity snippet. */}
            <script type="text/javascript" dangerouslySetInnerHTML={{ __html: clarityScript }} />
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
