import { loadRun } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Privacy policy — Cookiebannerbench";
export default function Image() {
  return renderOg(
    "Privacy policy.",
    "What this site processes",
    "Cookies · local storage · your rights",
    loadRun().runId,
  );
}
