"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/nextjs";
import type { ReactNode } from "react";

/**
 * c15t's hosted mode, as the package documents it. The provider resolves consent state from backendURL before deciding whether to show the banner, so this app's banner timing includes a network round trip.
 *
 * `children` is rendered on the server and passed through, so wrapping the
 * tree in this client component does not pull the page itself onto the client.
 */
export function Consent({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ConsentManagerProvider
      options={{ mode: "c15t", backendURL: "https://consent-bench-test-consent-bench.inth.app" }}
    >
      {children}
      <ConsentBanner />
      <ConsentDialog />
    </ConsentManagerProvider>
  );
}
