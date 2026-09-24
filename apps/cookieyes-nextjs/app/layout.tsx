import { CookieYesStyles } from "@cookieyes/nextjs/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Consent } from "@/app/consent";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * The full @cookieyes/nextjs integration as the docs recommend it, including
 * <CookieYesStyles />, which inlines the critical CSS into the first response
 * so the banner can paint without waiting on a stylesheet.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <CookieYesStyles />
      </head>
      <body>
        {children}
        <Consent />
      </body>
    </html>
  );
}
