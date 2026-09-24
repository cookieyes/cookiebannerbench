import { FieldStrip, RunDistribution, ScoreRing, ScoreTable, Waterfall } from "@/components/charts";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ICONS, Mark, MetricCard, Notice, Pill, ScoreChip, Value } from "@/components/ui";
import { loadAppMetadata, loadMeasurements, loadTargets } from "@/data/source";
import { DEFAULT_SLICE, detailHref } from "@/lib/config";
import { detailData } from "@/lib/detail";
import { formatDate, formatMetric } from "@/lib/metrics";
import { MODEL_LABEL } from "@/lib/models";
import type { Row } from "@/lib/ranking";
import { BAND_WORD, roundScore } from "@/lib/scoring";
import { datasetLd } from "@/lib/structured-data";

const half = (ci: { lower: number; upper: number } | undefined) =>
  ci ? (ci.upper - ci.lower) / 2 : null;

/** The arrow on the back link, and the corner mark on every outbound link. */
const BackArrow = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </svg>
);
const OutArrow = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />
  </svg>
);

export function DetailPage({
  app,
  profile = DEFAULT_SLICE.profile,
}: {
  app: string;
  profile?: string;
}) {
  const { entry, run, rows, row, control, conditions } = detailData(app, profile);
  const meta = loadAppMetadata(app);
  const target = loadTargets()[app];
  const loads = loadMeasurements(app).filter(
    (m) => m.profile === profile && m.cache === DEFAULT_SLICE.cache,
  );
  const bannerLoads = loads.map((m) => m.bannerVisible).filter((v): v is number => v !== null);
  const scores = row.scores;
  /** One measurement's score, wherever its category put it. */
  const metric = (id: string) =>
    scores.categories.flatMap((c) => c.metrics).find((m) => m.id === id);
  const bytes = metric("bytes");
  const over = (key: "fcp" | "tbt" | "cls" | "wireRequests") =>
    row.values[key] === undefined || control?.values[key] === undefined
      ? null
      : Math.max(0, (row.values[key] ?? 0) - (control.values[key] ?? 0));
  const spread = scores.spread
    ? `±${((scores.spread.high - scores.spread.low) / 2).toFixed(1)}`
    : null;
  const partial = !row.control && row.detected < (row.n ?? run.iterations);
  const band = scores.overall === null ? null : (scores.band ?? null);
  // The line under the numeral: the verdict, and how much the intervals move it.
  const bandLine = row.control
    ? "Control · not scored"
    : scores.overall === null
      ? "Not scored"
      : `${scores.provisional ? "Provisional" : BAND_WORD[band ?? "fair"]}${spread ? ` · ${spread}` : ""}`;
  const loadCount = row.n ?? run.iterations;
  const conditionLine = `${profile.replace("-", " ")} · cold cache · p75 of ${loadCount} loads`;
  // The npm name, which for a package's mode (c15t offline) is not the shown name.
  const npm = entry.npmPackage ?? row.package;
  const slug = npm ? `${npm}@${row.version.split("@").pop()}` : row.app;

  const facts: [string, string][] = [
    ["Delivery", MODEL_LABEL[row.installModel]],
    ["Package", row.package ? row.version : "None (vendor script)"],
    ["Framework of the test app", meta.framework],
    ["Language", meta.language],
    ["Bundle type", meta.bundleType],
    ["SDK licence", meta.license],
    ["Open source SDK", meta.openSource],
    ["Deployed", target ? formatDate(target.deployedAt) : "Not recorded"],
    ["Loads in this run", `${run.iterations} per condition · ${conditions.length} conditions`],
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="page">
        <JsonLd data={datasetLd(run, detailHref(app, profile), [row])} />

        <div className="page-top">
          <a className="btn ghost back" href="/">
            <BackArrow />
            Back to leaderboard
          </a>
          <nav className="crumbs t-ident-sm" aria-label="Breadcrumb">
            <a href="/">Leaderboard</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{row.package ?? row.label}</span>
          </nav>
        </div>

        {/* Who this is, and the ways out to the source of it */}
        <header className="provider-head">
          <Mark app={entry} size="lg" />
          <div className="names">
            <h1 className="t-title">{row.label}</h1>
            <div className="t-ident secondary">{slug}</div>
            {/* Delivery, and a provisional flag when one applies. The publisher
                affiliation is carried by the footer and /about/, not repeated
                on every row of every page. */}
            <div className="pills">
              <Pill>{MODEL_LABEL[row.installModel]}</Pill>
              {scores.provisional ? <Pill unmeasured>Provisional</Pill> : null}
            </div>
          </div>
          <div className="links">
            {entry.vendorUrl ? (
              <a className="btn ghost" href={entry.vendorUrl} rel="noopener">
                Vendor site
                <OutArrow />
              </a>
            ) : null}
            {npm ? (
              <a className="btn ghost" href={`https://www.npmjs.com/package/${npm}`} rel="noopener">
                npm
                <OutArrow />
              </a>
            ) : null}
            <a className="btn ghost" href={row.url} rel="noopener">
              Test app
              <OutArrow />
            </a>
            <a className="btn" href={`/cmp/${app}/trace.json`} download>
              Download trace
            </a>
          </div>
        </header>

        {/* The score, and the four categories it is made of */}
        <section className="region card score-panel" aria-labelledby="score-h">
          <h2 id="score-h" className="sr-only">
            Score and composition
          </h2>
          <ScoreRing scores={scores} band={bandLine} />
          {row.control ? (
            <div className="prose">
              <p className="t-body">
                This page carries no consent SDK. It is the control every installation on this
                condition is measured against: first paint, blocking, bytes and requests are scored
                as the increase over these figures.
              </p>
              <p className="t-body-sm secondary">
                First paint {formatMetric(row.values.fcp ?? null, "ms")} · blocking{" "}
                {formatMetric(row.values.tbt ?? null, "ms")} ·{" "}
                {formatMetric(row.values.wireBytes ?? row.values.transferBytes ?? null, "bytes")}{" "}
                over the wire · {row.values.wireRequests ?? row.values.requestCount} requests · LCP{" "}
                {formatMetric(row.values.lcp ?? null, "ms")}.
              </p>
            </div>
          ) : (
            <ScoreTable scores={scores} condition={conditionLine} />
          )}
        </section>

        {/* Only when there is something missing to account for. */}
        {scores.provisional || partial ? (
          <div className="region">
            <Notice
              variant="warning"
              title={
                scores.overall === null
                  ? "Not scored on this condition."
                  : scores.provisional
                    ? "Provisional score."
                    : "Banner missed on some loads."
              }
            >
              {partial
                ? `The banner was detected in ${row.detected} of ${loadCount} loads on this condition${row.detected === 0 ? ", so time to banner and coverage have no value" : ""}. `
                : ""}
              {bytes?.measured === false ? `${bytes.note}. ` : ""}
              {scores.overall === null
                ? "Nothing could be measured, so there is no score — a dash, not a zero."
                : scores.provisional
                  ? `The score was computed over the ${Math.round(scores.weightMeasured * 100)}% of weight that was measured; the unmeasured arcs are left as bare track. Nothing missing was filled with a zero.`
                  : "The score is computed from the loads in which it appeared; the missed loads are counted here, not hidden."}
            </Notice>
          </div>
        ) : null}

        {/* What was measured: the headline measurement of each category, with
            the other measurement in it underneath, so every scored cost is on
            the page beside the points it earned. */}
        <section className="region" aria-label="Measured">
          <div className="grid-4">
            <MetricCard
              label="Time to banner"
              icon={ICONS.clock}
              value={row.control ? null : row.values.bannerVisible}
              unit="ms"
              sub={
                row.control
                  ? "No banner on the control"
                  : `±${Math.round(half(row.intervals.bannerVisible) ?? 0)} ms across loads`
              }
            />
            <MetricCard
              label="First-paint delay"
              icon={ICONS.paint}
              value={row.control ? row.values.fcp : over("fcp")}
              unit="ms"
              sub={
                row.control
                  ? "First paint on the control"
                  : `Beyond the control's ${formatMetric(control?.values.fcp ?? null, "ms")} · TBT +${formatMetric(over("tbt"), "ms")}`
              }
            />
            <MetricCard
              label="Transferred"
              icon={ICONS.download}
              value={
                row.control
                  ? (row.values.wireBytes ?? row.values.transferBytes)
                  : bytes?.measured
                    ? bytes.cost
                    : null
              }
              unit="bytes"
              sub={
                row.control
                  ? "Total for the control page"
                  : bytes?.measured
                    ? `Beyond the control's ${formatMetric(control?.values.wireBytes ?? null, "bytes")} · +${over("wireRequests") ?? "—"} requests`
                    : (bytes?.note ?? "Not measured")
              }
            />
            <MetricCard
              label="Viewport blocked"
              icon={ICONS.viewport}
              value={
                row.control || row.values.bannerVisible === undefined
                  ? null
                  : row.values.bannerViewportCoverage
              }
              unit="percent"
              sub={
                row.control
                  ? "No banner on the control"
                  : row.values.bannerVisible === undefined
                    ? "No banner detected on this condition"
                    : metric("inert")?.measured
                      ? `Of the first viewport · clickable ${formatMetric(metric("inert")?.cost ?? null, "ms")} later`
                      : "Of the first viewport, at detection"
              }
            />
          </div>
        </section>

        {/* Every load, and where this sits */}
        <section className="region" aria-label="Every load, and where this sits">
          <div className="grid-2">
            <RunDistribution
              values={bannerLoads}
              expected={run.iterations}
              label="time to banner"
            />
            <FieldStrip row={row} rows={rows} />
          </div>
        </section>

        {/* How the banner lands */}
        <section className="region" aria-label="How the banner lands">
          <Waterfall row={row} control={row.control ? undefined : control} />
        </section>

        {/* The same installation on every condition in this run */}
        <section className="region" aria-label="Across conditions">
          <section
            className="card mini-wrap"
            style={{ padding: "var(--space-3) var(--space-3) var(--space-2)" }}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be keyboard-reachable (axe scrollable-region-focusable); the tabIndex is the accessibility fix, not a defect.
            tabIndex={0}
            aria-label="Across conditions; scrolls sideways"
          >
            <div className="t-label">Across conditions · p75 per condition</div>
            <table className="mini t-data">
              <caption className="sr-only">
                {row.label} across conditions, run {run.runId}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="l">
                    <span className="t-label">Condition</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">Score</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">Rank</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">Time to banner</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">Transferred</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">Viewport blocked</span>
                  </th>
                  <th scope="col">
                    <span className="t-label">LCP</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {conditions.map(({ slice, row: r, rows: all }) => {
                  const b = r.scores.categories
                    .flatMap((c) => c.metrics)
                    .find((m) => m.id === "bytes");
                  return (
                    <tr key={`${slice.profile}${slice.cache}`}>
                      <td className="l t-ident">
                        {slice.profile === profile ? (
                          <span aria-current="page">
                            {slice.profile} · {slice.cache}
                          </span>
                        ) : (
                          <a href={detailHref(app, slice.profile)}>
                            {slice.profile} · {slice.cache}
                          </a>
                        )}
                      </td>
                      <td>
                        <ScoreChip scores={r.scores} />
                      </td>
                      <td className="t-ident secondary">
                        {r.rank ? `${r.rank} / ${all.filter((x) => !x.control).length}` : "—"}
                      </td>
                      <td>
                        <Value value={r.control ? null : r.values.bannerVisible} unit="ms" />
                      </td>
                      <td>
                        <Value value={b?.measured ? b.cost : null} unit="bytes" />
                      </td>
                      <td>
                        <Value
                          value={r.control ? null : r.values.bannerViewportCoverage}
                          unit="percent"
                        />
                      </td>
                      <td>
                        <Value value={r.values.lcp} unit="ms" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </section>

        {/* Reported, not scored */}
        <section className="region headed" aria-labelledby="facts-h">
          <div className="section-head">
            <h2 id="facts-h" className="t-title">
              Reported, not scored <Pill>Does not affect the number</Pill>
            </h2>
          </div>
          <div className="card facts-kv">
            {[facts.slice(0, 5), facts.slice(5)].map((column) => (
              <div className="col" key={column[0]?.[0]}>
                {column.map(([k, v]) => (
                  <div className="kv" key={k}>
                    <span className="k t-body">{k}</span>
                    <span className="v t-ident">{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export function detailSummary(row: Row) {
  return row.control
    ? `Control · LCP ${formatMetric(row.values.lcp ?? null, "ms")}`
    : `${roundScore(row.scores.overall ?? 0)} · ${row.scores.band ? BAND_WORD[row.scores.band] : ""}`;
}
