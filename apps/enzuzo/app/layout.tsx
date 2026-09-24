import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Enzuzo cookie bar.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://app.enzuzo.com/scripts/cookiebar/270140fe-6a36-11f1-ac49-a348dec6caeb" />
      </head>
      <body>{children}</body>
    </html>
  );
}
