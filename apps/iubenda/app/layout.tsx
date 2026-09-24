import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ConsentBench" };

/**
 * Iubenda Cookie Solution, using the widget-bundle install.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://embeds.iubenda.com/widgets/db1399a1-c6bf-4944-9cbb-165a00597c2e.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
