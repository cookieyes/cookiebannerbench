import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Ketch smart tag. The bootstrapping snippet is the vendor's own, kept verbatim.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>
          {`!function(){window.semaphore=window.semaphore||[],window.ketch=function(){window.semaphore.push(arguments)};var n=document.createElement("script");n.type="text/javascript",n.src="https://global.ketchcdn.com/web/v3/config/kozilor/website_smart_tag/boot.js",n.defer=n.async=!0,document.getElementsByTagName("head")[0].appendChild(n)}();`}
        </script>
      </head>
      <body>{children}</body>
    </html>
  );
}
