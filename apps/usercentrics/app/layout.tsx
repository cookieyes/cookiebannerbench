import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Usercentrics V2 (app.usercentrics.eu/browser-ui). V2 uses data-settings-id; the legacy V1 loader endpoint returns 403 for new accounts.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://app.usercentrics.eu/browser-ui/latest/autoblocker.js" />
        <script
          id="usercentrics-cmp"
          src="https://app.usercentrics.eu/browser-ui/latest/loader.js"
          data-settings-id="fzhvjFMU2pnAPi"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
