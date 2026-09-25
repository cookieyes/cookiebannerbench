import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Leaderboard } from "@/components/leaderboard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Notice } from "@/components/ui";
import { loadHistory, runIds } from "@/data/source";
import { LEADERBOARD_SLICE } from "@/lib/config";
import { formatDate } from "@/lib/metrics";
import { leaderboardData } from "@/lib/page-data";
import { pageMetadata } from "@/lib/page-metadata";
import { methodForRun } from "@/lib/scoring";
import { itemListLd, runDatasetLd } from "@/lib/structured-data";

export const dynamicParams = false;
export function generateStaticParams() {
  return runIds().map((runId) => ({ runId }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<Metadata> {
  const { runId } = await params;
  if (!runIds().includes(runId)) notFound();
  return pageMetadata({
    title: `Run ${runId.slice(0, 10)} — recorded results`,
    description: `Published installation measurements from run ${runId}, with the original profile and cache conditions.`,
    path: `/runs/${runId}/`,
  });
}

export default async function Run({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!runIds().includes(runId)) notFound();
  const { run, slices } = leaderboardData(runId);
  const history = loadHistory().find((r) => r.id === runId);
  const rows =
    slices[
      `${LEADERBOARD_SLICE.profile}|${LEADERBOARD_SLICE.cache}|${LEADERBOARD_SLICE.percentile}`
    ] ?? [];
  const hasControl = rows.some((r) => r.control);
  const latest = runIds().at(-1) === runId;
  return (
    <>
      <SiteHeader />
      <main id="main" className="page">
        <JsonLd data={runDatasetLd(run, formatDate(run.finishedAt))} />
        <JsonLd data={itemListLd(rows, `/runs/${runId}/`)} />
        <section className="opening region">
          <nav className="crumbs t-ident-sm" aria-label="Breadcrumb" style={{ paddingTop: 0 }}>
            <a href="/runs/">Run history</a>
            <span aria-hidden="true">/</span>
            <span>{runId}</span>
          </nav>
          <h1 className="t-display" style={{ marginTop: "var(--space-4)" }}>
            The {formatDate(run.startedAt)} run.
          </h1>
          <p className="lede t-body">
            {history?.targets} targets measured, {run.apps.length} published under today's inclusion
            rule, {run.iterations} loads per condition. Detail links open the latest pages; the
            figures below belong to this run.
          </p>
          {!hasControl ? (
            <div
              className="block"
              style={{ marginTop: "var(--space-4)", maxWidth: "var(--prose-max)" }}
            >
              <Notice variant="warning" title="No score for this run.">
                It did not include the no-SDK control, so first paint, blocking, bytes and requests
                cannot be expressed as a cost beyond the page itself. Measurements are shown; the
                score column is a dash.
              </Notice>
            </div>
          ) : !latest ? (
            <div
              className="block"
              style={{ marginTop: "var(--space-4)", maxWidth: "var(--prose-max)" }}
            >
              <Notice>
                Historical run, scored under the method in force when it was recorded — v
                {methodForRun(run.startedAt)} — against its own control. Its scores are not compared
                with another run&rsquo;s.
              </Notice>
            </div>
          ) : null}
        </section>
        <Leaderboard slices={slices} profiles={run.profiles} runId={run.runId} />
      </main>
      <SiteFooter />
    </>
  );
}
