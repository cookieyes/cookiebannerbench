import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Leaderboard } from "@/components/leaderboard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LEADERBOARD_SLICE, SITE_URL } from "@/lib/config";
import { leaderboardData } from "@/lib/page-data";
import { PUBLISHED } from "@/lib/published";
import { datasetLd, itemListLd } from "@/lib/structured-data";

/** Counted from the published set, so the number in the description cannot drift. */
const INSTALLS = PUBLISHED.filter((p) => p.installModel !== "control").length;

export const metadata: Metadata = {
  title: "What consent banners cost the pages they sit on",
  description: `${INSTALLS} consent installations and a no-SDK control, measured on identical pages: banner speed, page impact, network cost and visitor experience, scored against published anchors.`,
  alternates: { canonical: `${SITE_URL}/` },
};

/**
 * The leaderboard, and nothing after it. The score's arithmetic, the install
 * models and the limits all live on the methodology page, one click from the
 * top bar on every page — the disclosure requirement is that they are reachable
 * and in view where they apply, not that they are restated under the table.
 *
 * The run's own conditions are not restated here either: they sit in the chart
 * card's title row and the table's toolbar, next to the figures they qualify.
 */
export default function Home() {
  const { run, slices } = leaderboardData();
  const rows =
    slices[
      `${LEADERBOARD_SLICE.profile}|${LEADERBOARD_SLICE.cache}|${LEADERBOARD_SLICE.percentile}`
    ] ?? [];
  return (
    <>
      <SiteHeader current="/" />
      <main id="main" className="page">
        <JsonLd data={datasetLd(run, "/", rows)} />
        <JsonLd data={itemListLd(rows)} />

        <section className="opening region">
          <h1 className="t-display">The open benchmark for what consent banners actually cost.</h1>
          <p className="lede t-body">
            We run every major consent banner under identical, fixed conditions and score it on
            banner speed, page impact, network cost and visitor experience. Open source,
            reproducible, and rerun as vendors change.
          </p>
        </section>

        <Leaderboard slices={slices} profiles={run.profiles} runId={run.runId} />
      </main>
      <SiteFooter />
    </>
  );
}
