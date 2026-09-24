import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Consent } from "@/app/consent";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Identical to cookieyes-nextjs except that it does not render
 * <CookieYesStyles />. Everything else — package, components, config — matches,
 * so the delta against cookieyes-nextjs is the value of shipping the banner's
 * critical CSS in the first response, and nothing else.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Consent />
      </body>
    </html>
  );
}
