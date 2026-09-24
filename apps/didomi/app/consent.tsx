"use client";

import { DidomiSDK } from "@didomi/react";

/**
 * Didomi's own React wrapper, which injects the SDK and the TCF stub. The
 * callbacks the package documents are omitted deliberately — anything running
 * in them would be measured as the SDK's cost.
 */
export function Consent() {
  return (
    <DidomiSDK
      apiKey="7dd8ec4e-746c-455e-a610-99121b4148df"
      gdprAppliesGlobally={true}
      embedTCFStub={true}
    />
  );
}
