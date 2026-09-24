import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * OneTrust, via the standard otSDKStub.js install. OptanonWrapper is required by the SDK even when empty.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js"
          charSet="UTF-8"
          data-domain-script="fff8df06-1dd2-491b-88f6-01cae248cd17"
          async
        />
        <script>{"function OptanonWrapper() {}"}</script>
      </head>
      <body>{children}</body>
    </html>
  );
}
