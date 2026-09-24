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

const themeScript =
  'try{var t=localStorage.getItem("cookiebannerbench-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant theme bootstrap, no interpolated input. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
