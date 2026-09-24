import { loadRun } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Cookiebannerbench — what consent banners cost the pages they sit on";
export default function Image() {
  const run = loadRun();
  return renderOg(
    "What consent banners cost the pages they sit on.",
    `${run.apps.length - 1}`,
    "installations and a no-SDK control, scored against published anchors",
    run.runId,
  );
}
