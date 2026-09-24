"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/react";
import type { ReactNode } from "react";

/**
 * The framework-agnostic package, so the Next adapter's overhead shows up as the difference against c15t-nextjs.
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
