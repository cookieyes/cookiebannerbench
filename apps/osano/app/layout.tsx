import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Osano, loaded from its CMP CDN.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cmp.osano.com/2sUBzx7wRdAfu6J2kkS/8e547744-886f-4a9b-a90f-7e96a47aa604/osano.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
