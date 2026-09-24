import type { InstallModel } from "@/lib/published";
export const MODEL_LABEL: Record<InstallModel, string> = {
  "self-hosted-npm": "Self-hosted npm",
  "hosted-backend": "Hosted backend",
  "vendor-cdn": "Vendor CDN script",
  control: "Control",
};
export const MODELS = [
  {
    id: "self-hosted-npm",
    title: "Self-hosted npm",
    number: "01",
    text: "The package is bundled with the test app. These installations render the banner without fetching consent state from a vendor backend. Their JavaScript and styles still contribute to the page’s work.",
  },
  {
    id: "hosted-backend",
    title: "Hosted backend",
    number: "02",
    text: "The package is bundled with the test app, but its provider resolves consent state through a hosted service before deciding whether to display the banner. Time to banner includes that network round trip.",
  },
  {
    id: "vendor-cdn",
    title: "Vendor CDN script",
    number: "03",
    text: "The test app loads the vendor’s script from a remote host. Script loading, account configuration and subsequent requests can affect when the banner appears. Its bytes are counted off the wire, so a host that hides its sizes from the page is measured all the same.",
  },
] as const;
