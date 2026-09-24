import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Consent } from "@/app/consent";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * @c15t/nextjs in its documented hosted configuration.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Consent>{children}</Consent>
      </body>
    </html>
  );
}
