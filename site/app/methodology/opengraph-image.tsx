import { loadRun } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Understand the measurement. — Cookiebannerbench";
export default function Image() {
  return renderOg(
    "Understand the measurement.",
    "Methods & metrics",
    "Inclusion criteria · Collector definitions · Scoring arithmetic",
    loadRun().runId,
  );
}
