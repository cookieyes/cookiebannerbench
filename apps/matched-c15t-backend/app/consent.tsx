"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/nextjs";
import type { ReactNode } from "react";

/**
 * c15t's hosted backend mode, matched against matched-cookieyes-backend so the two backed configurations are compared with each other rather than against an offline build.
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
