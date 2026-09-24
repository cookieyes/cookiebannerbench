import { loadRun } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "The publisher is in the comparison. — Cookiebannerbench";
export default function Image() {
  return renderOg(
    "The publisher is in the comparison.",
    "Published by CookieYes",
    "Ownership disclosure · Frequently asked questions",
    loadRun().runId,
  );
}
