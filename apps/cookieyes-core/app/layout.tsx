import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Consent } from "@/app/consent";

export const metadata: Metadata = { title: "ConsentBench" };

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
