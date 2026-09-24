import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Civic Cookie Control 9. The SDK is configured by an inline call rather than
 * data attributes, so the config object has to follow the script tag.
 */
const CONFIG = `
var config = {
  apiKey: 'cb6f488d5ef8673a647f9f2d8b37211338802dbb',
  product: 'COMMUNITY',
  optionalCookies: [
    { name: 'analytics', label: 'Analytical Cookies', description: 'Usage measurement.', cookies: [] },
    { name: 'marketing', label: 'Marketing Cookies', description: 'Advertising relevance.', cookies: [] }
  ]
};
CookieControl.load(config);
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cc.cdn.civiccomputing.com/9/cookieControl-9.x.min.js" />
        <script>{CONFIG}</script>
      </head>
      <body>{children}</body>
    </html>
  );
}
