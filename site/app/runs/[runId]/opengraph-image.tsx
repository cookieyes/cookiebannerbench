import { loadRun, runIds } from "@/data/source";
import { OG_SIZE, renderOg } from "@/lib/og";
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Historical run — Cookie Banner Bench";
export function generateStaticParams() {
  return runIds().map((runId) => ({ runId }));
}
export default async function Image({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = loadRun(runId);
  return renderOg(
    `The ${run.startedAt.slice(0, 10)} run.`,
    `${run.apps.length} published installations`,
    `${run.iterations} loads per condition · Original recorded measurements`,
    run.runId,
  );
}
