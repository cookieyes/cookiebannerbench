import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Leaderboard } from "@/components/leaderboard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LEADERBOARD_SLICE } from "@/lib/config";
import { leaderboardData } from "@/lib/page-data";
import { pageMetadata } from "@/lib/page-metadata";
import { PUBLISHED } from "@/lib/published";
import { benchmarkDatasetLd, itemListLd, siteLd } from "@/lib/structured-data";

/** Counted from the published set, so the number in the description cannot drift. */
const INSTALLS = PUBLISHED.filter((p) => p.installModel !== "control").length;

// The layout's title template would append the site name a second time.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Cookie Banner Performance Benchmark | Cookiebannerbench",
    description: `${INSTALLS} consent installations and a no-SDK control, measured on identical pages: banner speed, page impact, network cost and visitor experience, scored against published anchors.`,
    path: "/",
  }),
  title: { absolute: "Cookie Banner Performance Benchmark | Cookiebannerbench" },
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
        <JsonLd data={siteLd()} />
        <JsonLd data={benchmarkDatasetLd(run, rows)} />
        <JsonLd data={itemListLd(rows)} />

        <section className="opening region">
          {/* The h1 names the topic in the words people search for; the
              display line beneath it is the page's headline as read. */}
          <h1 className="t-label">Cookie banner performance benchmark</h1>
          <p className="t-display headline">
            The open benchmark for what consent banners actually cost.
          </p>
          <p className="lede t-body">
            Compare how consent banners affect loading speed, page performance, network cost and
            visitor experience under the same test conditions. Every result comes from repeatable
            benchmark runs with a public methodology and raw measurements. Open source, and rerun as
            vendors change.
          </p>
        </section>

        <Leaderboard slices={slices} profiles={run.profiles} runId={run.runId} />
      </main>
      <SiteFooter />
    </>
  );
}
