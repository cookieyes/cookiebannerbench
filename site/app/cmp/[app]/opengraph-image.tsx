import { detailData } from "@/lib/detail";
import { formatMetric } from "@/lib/metrics";
import { OG_SIZE, renderOg } from "@/lib/og";
import { PUBLISHED } from "@/lib/published";
import { BAND_WORD, roundScore } from "@/lib/scoring";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Measured installation result — Cookiebannerbench";
export function generateStaticParams() {
  return PUBLISHED.map((p) => ({ app: p.app }));
}
export default async function Image({ params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const { row, run } = detailData(app);
  if (row.control)
    return renderOg(
      "Baseline, no consent SDK",
      formatMetric(row.values.lcp ?? null, "ms"),
      "LCP · the control · throttled mobile, cold, p75",
      run.runId,
      "fair",
    );
  return renderOg(
    `${row.label} ${row.package ?? ""}`.trim(),
    String(roundScore(row.scores.overall ?? 0)),
    `${row.scores.band ? BAND_WORD[row.scores.band] : ""}${row.scores.provisional ? ", provisional" : ""} · ${formatMetric(row.values.bannerVisible ?? null, "ms")} to banner · throttled mobile, cold, p75`,
    run.runId,
    row.scores.band ?? undefined,
  );
}
