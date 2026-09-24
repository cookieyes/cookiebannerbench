"use client";

import { getOrCreateConsentRuntime } from "@cookieyes/core";
import { useEffect } from "react";

/**
 * @cookieyes/core is the headless engine: zero UI, zero runtime dependencies.
 * It ships no banner, so the harness will report "no banner detected" for this
 * app — that absence is the point. This measures the engine's cost alone, and
 * the difference against cookieyes-react is what the UI layer costs.
 */
export function Consent() {
  useEffect(() => {
    const { consentStore } = getOrCreateConsentRuntime({
      mode: "cookie-only",
      regulation: "GDPR",
      colorScheme: "system",
    });
    return consentStore.subscribe(() => {
      // A real integration would gate its analytics loaders here.
    });
  }, []);

  return null;
}
