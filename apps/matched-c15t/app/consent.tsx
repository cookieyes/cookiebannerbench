"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/nextjs";
import type { ReactNode } from "react";

/**
 * Matched against matched-cookieyes: offline mode, so no network round trip, and exactly two surfaces rendered.
 *
 * `children` is rendered on the server and passed through, so wrapping the
 * tree in this client component does not pull the page itself onto the client.
 */
export function Consent({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ConsentManagerProvider options={{ mode: "offline" }}>
      {children}
      <ConsentBanner />
      <ConsentDialog />
    </ConsentManagerProvider>
  );
}
