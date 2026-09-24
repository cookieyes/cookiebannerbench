import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * The control. No consent SDK at all — every other app's numbers are only
 * meaningful as a delta against this one.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
