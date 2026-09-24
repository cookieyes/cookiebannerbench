import { loadMeasurements, loadRun } from "@/data/source";
import { PUBLISHED, publishedTarget } from "@/lib/published";

/**
 * The raw trace behind one row: every individual load for this installation
 * in the published run, plus the summarised slices. A row that leads to a
 * summary of itself is not a disclosure; this is the thing the summary came from.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return PUBLISHED.map((p) => ({ app: p.app }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  if (!publishedTarget(app)) return new Response("Not found", { status: 404 });
  const run = loadRun();
  const body = {
    runId: run.runId,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    iterations: run.iterations,
    profiles: run.profiles,
    app: run.apps.find((a) => a.name === app),
    summary: Object.fromEntries(
      Object.entries(run.summary).filter(([key]) => key.startsWith(`${app}|`)),
    ),
    measurements: loadMeasurements(app),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
