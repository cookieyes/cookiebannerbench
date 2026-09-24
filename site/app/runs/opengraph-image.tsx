import { loadRun } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Every run keeps its date. — Cookiebannerbench";
export default function Image() {
  return renderOg(
    "Every run keeps its date.",
    "Run history",
    "Original conditions · Published installations · Recorded results",
    loadRun().runId,
  );
}
