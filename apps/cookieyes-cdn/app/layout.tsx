import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * CookieYes' hosted CDN product — the script-tag install, not the npm SDK. The contrast against cookieyes-nextjs is the whole reason both are here.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/f66d6dffd4f9c8178517db8d4aeddcaa/script.js"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
