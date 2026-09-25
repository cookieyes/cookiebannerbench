import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MethodPanel, MethodTabs } from "@/components/method-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Notice, Pill } from "@/components/ui";
import { DEFAULT_SLICE, GITHUB_URL } from "@/lib/config";
import { GLOSSARY } from "@/lib/glossary";
import { formatDate, METRICS } from "@/lib/metrics";
import { MODELS } from "@/lib/models";
import { leaderboardData } from "@/lib/page-data";
import { pageMetadata } from "@/lib/page-metadata";
import { INCLUSION_RULE } from "@/lib/published";
import { ANCHORS_FIXED, BANDS, formatAnchor, INPUTS, METHOD_VERSION } from "@/lib/scoring";
import { methodologyLd } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Banner Benchmark Methodology",
  description:
    "The run conditions, the four-category score with its eight measurements and their published anchors, shares and weights, the band cut-offs, number formatting, the collector's definition of every metric it records, what is published and why, and what these measurements cannot tell you.",
  path: "/methodology/",
});

/** The first published method (v1 in the changelog below). */
const FIRST_PUBLISHED = "2026-09-15";

/** Metrics the collector records, split the way the score treats them. */
const SCORED = METRICS.filter((m) => m.scored !== "reported");
const REPORTED = METRICS.filter((m) => m.scored === "reported");

function MetricCards({ list }: { list: typeof METRICS }) {
  return (
    <div className="grid-2">
      {list.map((m) => {
        const g = GLOSSARY[m.key];
        // A metric with no written definition is left out rather than shown with
        // empty paragraphs: on a page that exists to let a reader check the
        // method, a stub reads as a definition.
        if (!g) return null;
        return (
          <article key={m.key} id={m.key} className="card principle">
            <div className="t-label">
              {m.label}
              <Pill>
                {m.scored === "input" ? `scored · ${m.category}` : "reported, not scored"}
              </Pill>
            </div>
            <h3 className="t-section">{m.description}</h3>
            <p className="t-body-sm">{g.meaning}</p>
            <p className="t-body-sm">
              <b style={{ color: "var(--text-primary)" }}>Why it matters.</b> {g.matters}
            </p>
            <p className="t-body-sm">
              <b style={{ color: "var(--text-primary)" }}>Reading the value.</b> {g.good}
            </p>
            <p className="t-body-sm">
              <b style={{ color: "var(--text-primary)" }}>How it is captured.</b> {g.capture}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export default function Methodology() {
  const { run, slices } = leaderboardData();
  const rows =
    slices[`${DEFAULT_SLICE.profile}|${DEFAULT_SLICE.cache}|${DEFAULT_SLICE.percentile}`] ?? [];
  // Counted, not asserted: how many rows in the current run carry a provisional
  // score, and which input went unmeasured. A sentence naming a number that the
  // run no longer produces is the failure this page exists to prevent.
  const provisional = rows.filter((r) => !r.control && r.scores.provisional);

  return (
    <>
      <SiteHeader current="/methodology/" />
      <main id="main" className="page doc">
        <JsonLd data={methodologyLd(FIRST_PUBLISHED, ANCHORS_FIXED)} />
        <section className="opening region">
          <div className="opening-copy">
            {/* One document, so one h1. The three parts are named by the
                switcher beneath, which is where the design's board titles
                went when they became tabs rather than pages. */}
            <h1 className="t-display">How we test cookie banner performance</h1>
            <p className="lede t-body">
              Every score comes from real test runs on identical pages, not opinions. Here is
              exactly how each number is produced, which installations appear and why, and what
              these measurements cannot tell you, so you can check the lot yourself.
            </p>
            <p className="run-line t-body-sm">
              <span className="t-ident-sm">Method v{METHOD_VERSION}</span>
              <span aria-hidden="true">·</span>
              <span>anchors fixed {formatDate(ANCHORS_FIXED)}</span>
            </p>
          </div>
          <MethodTabs />
        </section>

        <MethodPanel id="tab-scoring">
          <section className="region prose" id="run">
            <h2 className="t-title">How a run works</h2>
            <p>
              Every installation is a small Next.js app on one host with the same page, differing
              only in the consent layer. The harness drives Chromium through Playwright and
              interleaves installations within each iteration, so a change in the measurement
              machine moves the whole cohort rather than one row. The current run is{" "}
              {`${run.runId};`}
              each profile has {run.iterations} loads per installation.
            </p>
            <p>
              Every load is cold: it starts in a fresh browser context with an empty cache and no
              stored consent. After load the harness waits for a 2,000 ms quiet window, allows up to
              15,000 ms for a banner and caps a load at 60,000 ms.
            </p>
            <p>
              <code>fast-desktop</code> applies no throttling. <code>throttled-mobile</code> applies
              4× CPU slowdown, 1,638 kbps down, 750 kbps up and 150 ms added latency. The profile
              name describes throttling, not phone-screen emulation. Dates are UTC.
            </p>
            <p>
              The leaderboard opens on <code>fast-desktop</code>; <code>throttled-mobile</code> is
              one selection away, and there is no cache selection because every load is cold. An
              installation's detail page opens on whichever profile the leaderboard was showing, and
              links to the other.
            </p>
            <p>
              The test installations carry their own framework setup, so a difference between two
              pages includes that setup. It is not a controlled estimate of SDK cost alone, which is
              why every cost is expressed against the no-SDK control on the same condition.
            </p>
          </section>

          <section className="region" id="score">
            <div className="section-head">
              <h2 className="t-title">The score formula and weights</h2>
              <p className="t-body-sm">
                Four categories and eight measurements, every one of them a cost the page or the
                visitor pays. Each measurement maps to 0–100 by a linear anchor; each category is
                the share-weighted mean of its measurements; the categories combine by fixed
                weights. Anchors, shares and weights were fixed on {formatDate(ANCHORS_FIXED)},
                before the run they score, and changing one is a method change.
              </p>
            </div>
            <section
              className="card mini-wrap"
              style={{ padding: "var(--space-3) var(--space-3) var(--space-2)" }}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be keyboard-reachable (axe scrollable-region-focusable); the tabIndex is the accessibility fix, not a defect.
              tabIndex={0}
              aria-label="Score categories and measurements; scrolls sideways"
            >
              <table className="mini t-body">
                <caption className="sr-only">
                  Score categories, their measurements, shares and anchors
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="l">
                      <span className="t-label">Category · measurement</span>
                    </th>
                    <th scope="col">
                      <span className="t-label">Weight</span>
                    </th>
                    <th scope="col">
                      <span className="t-label">Share</span>
                    </th>
                    <th scope="col" className="l">
                      <span className="t-label">0 at</span>
                    </th>
                    <th scope="col" className="l">
                      <span className="t-label">Measured as</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {INPUTS.flatMap((category) => [
                    <tr key={category.id}>
                      <th scope="row" className="l" style={{ fontWeight: 500 }}>
                        {category.label}
                      </th>
                      <td className="t-data">{Math.round(category.weight * 100)} %</td>
                      <td />
                      <td />
                      <td
                        className="l t-body-sm secondary"
                        style={{ whiteSpace: "normal", minWidth: 260 }}
                      >
                        {category.explain}
                      </td>
                    </tr>,
                    ...category.metrics.map((metric) => (
                      <tr key={`${category.id}-${metric.id}`}>
                        <td className="l t-body-sm" style={{ paddingLeft: "var(--space-4)" }}>
                          {metric.label}
                        </td>
                        <td />
                        <td className="t-data">{Math.round(metric.share * 100)} %</td>
                        <td className="l t-ident secondary">
                          {formatAnchor(metric.anchor, metric.unit)}
                        </td>
                        <td
                          className="l t-body-sm secondary"
                          style={{ whiteSpace: "normal", minWidth: 260 }}
                        >
                          {metric.explain}
                        </td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </section>
            <div className="prose" style={{ marginTop: "var(--space-6)" }}>
              <p className="t-body">
                <code>points = 100 × (1 − min(cost, anchor) / anchor)</code> for each measurement;{" "}
                <code>category = Σ (share × points) / Σ share</code> over its measured measurements;{" "}
                <code>score = Σ (weight × category) / Σ weight</code> over the measured categories.
                Every measurement the host page also affects — first paint, blocking, bytes,
                requests — is the increase over the identical page with no consent SDK. Time to
                banner, coverage and the wait until the banner can be clicked are absolute, because
                the control has no banner. The score is rounded once, to an integer, and the band is
                read from the rounded number.
              </p>
              <p className="t-body">
                <b>Browser timings on the leaderboard.</b> FCP, LCP, TBT and CLS are shown the same
                way the score reads its inputs: <code>max(0, value − control)</code> on the profile
                and percentile being shown. The test site's own load time (DNS, TLS, the server's
                response, HTML, CSS and fonts) is the control's too, so it is taken out and what
                remains is the consent layer's. An installation that came out faster than the
                control shows 0. Detail pages keep the absolute timings, with the control's own
                figure beside each delay.
              </p>
              <p className="t-body">
                <b>Bands:</b> Good {BANDS.good}–100, Fair {BANDS.fair}–{BANDS.good - 1}, Poor below{" "}
                {BANDS.fair}. Inclusive at the lower end. The middle band is most of the field.
              </p>
              <p className="t-body">
                <b>No banner, no score.</b> On a condition where no banner was detected there is
                nothing to score: the row keeps its measurements and a dash, never a number built
                from the measurements that remain, and coverage is never read as 0 % when there was
                no banner to cover anything. When the banner was detected in fewer loads than the
                run made, the row says so.
              </p>
              <p className="t-body">
                <b>Provisional scores.</b> When a measurement could not be taken, its arc stays
                empty, its card shows a dash and the score is computed over the remaining weight.
                The leaderboard row inherits the marker. Unknown, not zero.{" "}
                {provisional.length === 0
                  ? "Every installation in the current run was measured on everything, so no score is provisional."
                  : `In the current run ${provisional.length} of ${rows.filter((r) => !r.control).length} installations are provisional — ${provisional
                      .map((r) => `${r.label}${r.package ? ` ${r.package}` : ""}`)
                      .join(", ")}.`}
              </p>
              <p className="t-body">
                <b>Spread.</b> The ± beside a score is half the range the score takes when every
                measurement is moved to the bounds of its 95% bootstrap interval. Two scores whose
                ranges overlap have not been shown to differ.
              </p>
              <p className="t-body">
                <b>Not in the score:</b>{" "}
                {REPORTED.map((m) => m.description)
                  .join(", ")
                  .toLowerCase()}
                , the delivery model, the test app's framework and the SDK's licence. They are{" "}
                <Pill>reported, not scored</Pill>. LCP in particular is reported on every row and
                card so that a fast banner cannot hide a slower page.
              </p>
            </div>
          </section>

          <section className="region prose" id="statistics">
            <h2 className="t-title">Percentiles and uncertainty</h2>
            <p>
              The default is p75: the estimated 75th percentile of loads in a condition. p50 is the
              median; p95 the slower tail. Each estimate carries a 95% bootstrap interval from 1,000
              resamples with a fixed seed. Overlapping intervals mean the displayed intervals do not
              establish a difference; they do not prove equivalence, and non-overlap says nothing
              about a vendor outside this run. Every detail page plots all {run.iterations} loads
              with the median filled, so a tie is visible as a tie.
            </p>
          </section>

          <section className="region prose" id="numbers">
            <h2 className="t-title">Numbers and units</h2>
            <ul className="t-body">
              <li>Time under 1 s is an integer in ms; 1 s and over has one decimal in s.</li>
              <li>
                Bytes under 1024 are B; 1024 and over have one decimal in KB or MB. KB means 1024
                bytes throughout.
              </li>
              <li>
                Coverage has one decimal in %, and keeps its zero. Layout shift has three decimals.
              </li>
              <li>Scores are integers, 0–100. Spread is ± with one decimal.</li>
              <li>
                Precision never exceeds the measurement: if the spread is ±1.4 the score does not
                gain a decimal.
              </li>
              <li>Dates are day, abbreviated month, year, in UTC.</li>
            </ul>
          </section>

          <section className="region" id="glossary">
            <div className="section-head">
              <h2 className="t-title">Every metric the collector records</h2>
              <p className="t-body-sm">
                Definitions follow the collector, including where its algorithm differs from
                standard lab or field metrics.
              </p>
            </div>
            <h3 className="t-section">Scored inputs</h3>
            <MetricCards list={SCORED} />
            <h3 className="t-section">Reported, not scored</h3>
            <MetricCards list={REPORTED} />
          </section>
        </MethodPanel>

        <MethodPanel id="tab-published">
          <section className="region prose" id="published">
            <h2 className="t-title">What gets included or excluded</h2>
            <p>{INCLUSION_RULE}</p>
            <p>
              An absent provider is a fact about this benchmark, not about the provider. A run that
              did not complete keeps its row with a dash where the run produced nothing. Never a
              zero, because a zero is a measurement.
            </p>
          </section>

          <section className="region" id="models">
            <div className="section-head">
              <h2 className="t-title">The three delivery types</h2>
              <p className="t-body-sm">
                Reported on each detail page under Delivery. Compare installations, not
                architectures in isolation.
              </p>
            </div>
            <div className="grid-3">
              {MODELS.map((m) => (
                <div key={m.id} className="card principle">
                  <div className="t-label">
                    <span className="t-ident-sm">{m.number}</span>
                    {m.title}
                  </div>
                  <p className="t-body-sm">{m.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="region prose" id="reproduce">
            <h2 className="t-title">How to reproduce or dispute a result</h2>
            <p className="t-body">
              The harness, every test app and every run manifest are in{" "}
              <a href={GITHUB_URL}>the repository</a>. <code>pnpm bench</code> runs the harness
              against the deployed targets in <code>targets.json</code> and writes a new directory
              under <code>results/</code>; the site is built from those directories and nothing
              else.
            </p>
            <p className="t-body">
              To dispute a number, open an issue with the installation, run ID and condition, or{" "}
              <a href="https://www.cookieyes.com/contact/">contact CookieYes</a>, which publishes
              the site. A configuration fix is re-run and the new run is published beside the old
              one; the old one is not edited.
            </p>
          </section>

          <section className="region prose" id="changelog">
            <h2 className="t-title">Changelog</h2>
            <p>
              The method is versioned. Every result names the method version and run it came from,
              and a method change never rewrites an older run.
            </p>
            <div className="card card-pad">
              <div className="t-label">Method changelog</div>
              <dl className="t-body" style={{ marginTop: "var(--space-2)" }}>
                <dt className="t-ident">
                  v{METHOD_VERSION} · {formatDate(ANCHORS_FIXED)}
                </dt>
                <dd className="secondary t-body-sm">
                  Four categories over eight measurements: Banner Speed 30 % (time to banner, 0 at 5
                  s), Page Impact 25 % (first-paint delay, 0 at 3 s; blocking added, 0 at 600 ms),
                  Network Cost 25 % (bytes added, 0 at 250 KB; requests added, 0 at 20) and Visitor
                  Experience 20 % (viewport coverage, 0 at 50 %; wait until clickable, 0 at 1 s).
                  Bytes and requests are read off the wire rather than from Resource Timing, so a
                  host that hides its sizes no longer leaves a row provisional. Layout shift is
                  reported, not scored. Every load is cold. Bands unchanged at 80 and 60.
                </dd>
                <dt className="t-ident">v1 · 15 Sep 2026</dt>
                <dd className="secondary t-body-sm">
                  The first published method. Four inputs with linear anchors — time to banner 2.5
                  s, transferred bytes 250 KB, viewport coverage 50 %, and page stability as the
                  mean of CLS (0.25) and TBT (600 ms) — weights 30/25/25/20, bands at 80 and 60.
                  Bytes came from Resource Timing; a host that hid its sizes left the row
                  provisional.
                </dd>
              </dl>
            </div>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Notice>
                When the method changes, historical scores are not recomputed, so a difference
                between two runs never measures our method rather than the provider.
              </Notice>
            </div>
          </section>
        </MethodPanel>

        <MethodPanel id="tab-limits">
          <section className="region prose" id="limits">
            <h2 className="t-title">What this cannot tell you</h2>
            <ul className="t-body">
              <li>
                No consent is accepted or rejected in a run, so nothing about interaction, INP
                included, is measured.
              </li>
              <li>
                Account settings, geography, cache state and a different app integration can change
                the result. These figures describe the recorded run.
              </li>
              <li>
                Banner detection depends on configured selectors and a visibility check. A detected
                element is not a compliance audit.
              </li>
              <li>
                Bytes and requests come from the browser&rsquo;s network log, which is not a view of
                the vendor&rsquo;s servers. A dash means unmeasured; it never means nothing
                happened.
              </li>
              <li>
                The load waterfall on a detail page marks four measured moments: first paint, the
                largest paint, the control's largest paint, and when the banner became visible. The
                bars between them are drawn to fixed proportions, because a run records when each
                phase ended and not when the browser handed one phase to the next. Read them as
                shape, not as timings.
              </li>
              <li>
                The site's own Lighthouse and accessibility audits are separate from the benchmark
                measurements in its tables.
              </li>
            </ul>
          </section>
        </MethodPanel>
      </main>
      <SiteFooter />
    </>
  );
}
