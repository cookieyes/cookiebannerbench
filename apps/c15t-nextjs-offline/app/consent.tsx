"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/nextjs";
import type { ReactNode } from "react";

/**
 * The same package as c15t-nextjs, in c15t's own documented offline mode: no backend, so the banner renders without a consent-state round trip. Published beside the hosted install rather than instead of it — the round trip is a real cost, and dropping the condition that carries it would remove the comparison, not improve it.
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
