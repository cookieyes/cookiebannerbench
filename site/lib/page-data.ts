import { loadRun, runIds } from "@/data/source";
import { availableSlices, buildRows, type Row } from "@/lib/ranking";

/**
 * Every condition's rows for one run, scored and ranked, with the score change
 * against the run before it when there is one.
 */
export function leaderboardData(id?: string) {
  const run = loadRun(id);
  const ids = runIds();
  const index = ids.indexOf(run.runId);
  const previous = index > 0 ? loadRun(ids[index - 1]) : undefined;
  const slices: Record<string, Row[]> = {};
  for (const s of availableSlices(run))
    for (const percentile of ["p50", "p75", "p95"] as const)
      slices[`${s.profile}|${s.cache}|${percentile}`] = buildRows(
        run,
        { ...s, percentile },
        previous,
      );
  return { run, slices, previous };
}
