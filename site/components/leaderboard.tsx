import { Mark, ScoreChip, Value } from "@/components/ui";
import { detailHref, LEADERBOARD_SLICE } from "@/lib/config";
import { formatMetric, type Unit } from "@/lib/metrics";
import { MODEL_LABEL } from "@/lib/models";
import type { Row, Slice } from "@/lib/ranking";
import { INPUTS, roundScore } from "@/lib/scoring";

/* ── Columns ──────────────────────────────────────────────────────────────
   Order is the order a reader would ask about them: the verdict, then the
   plain-language costs behind it, then the browser's own timings. Priority is
   the order they drop from the right as the viewport narrows; provider and
   score never drop.

   The plain-language costs define themselves in a tooltip on the header. The
   browser metrics are acronyms, so they carry a focusable (i) instead, and
   their tooltip leads with the name spelled out and says whether — and how —
   the score uses it. */
export interface Column {
  key: string;
  label: string;
  define: string;
  /** Spelled-out name, for the acronym columns; its presence draws the (i). */
  term?: string;
  unit?: Unit;
  priority: number;
  /** "desc" for the score; every cost sorts ascending. */
  dir: "asc" | "desc";
  /** The tooltip hangs off the left edge on the columns nearest the provider. */
  tipLeft?: boolean;
  lang?: boolean;
}
export const COLUMNS: Column[] = [
  {
    key: "score",
    label: "Score",
    define:
      "0–100 against published anchors: Banner Speed 30%, Page Impact 25%, Network Cost 25%, Visitor Experience 20%. Good ≥ 80, Fair 60–79, Poor < 60.",
    priority: 2,
    dir: "desc",
    tipLeft: true,
  },
  {
    key: "bannerVisible",
    label: "Time to banner",
    define: "From navigation start until the consent banner was detected as visible.",
    unit: "ms",
    priority: 3,
    dir: "asc",
    tipLeft: true,
  },
  {
    key: "extraBytes",
    label: "Payload",
    define: "Bytes transferred beyond the no-SDK control on the same condition, read off the wire.",
    unit: "bytes",
    priority: 4,
    dir: "asc",
  },
  {
    key: "bannerViewportCoverage",
    label: "Viewport blocked",
    define: "Share of the first viewport the banner's bounding box occupied when detected.",
    unit: "percent",
    priority: 5,
    dir: "asc",
  },
  {
    key: "lcp",
    label: "LCP",
    term: "Largest Contentful Paint",
    define:
      "How long until the biggest element on screen, usually the main image or headline, has rendered. Reported, not scored.",
    unit: "ms",
    priority: 8,
    dir: "asc",
  },
  {
    key: "cls",
    label: "CLS",
    term: "Cumulative Layout Shift",
    define:
      "How much content jumps around while the page loads, for example when a banner pushes it down. 0 means nothing moved. Reported, not scored.",
    unit: "shift",
    priority: 9,
    dir: "asc",
  },
  {
    key: "tbt",
    label: "TBT",
    term: "Total Blocking Time",
    define:
      "How long scripts kept the browser too busy to respond to a tap or click, counting only the part of each long task past 50 ms. Scored in Page Impact, as the increase over the no-SDK control.",
    unit: "ms",
    priority: 11,
    dir: "asc",
  },
  {
    key: "fcp",
    label: "FCP",
    term: "First Contentful Paint",
    define:
      "How long until the first text or image appears on screen. Scored in Page Impact, as the delay beyond the no-SDK control.",
    unit: "ms",
    priority: 11,
    dir: "asc",
  },
];

/** The number a cell shows, or null for a dash. Costs are what the row cost beyond the control. */
export function cellValue(row: Row, key: string): number | null {
  if (key === "score") return row.scores.overall === null ? null : roundScore(row.scores.overall);
  if (key === "extraBytes") {
    if (row.control) return 0;
    const bytes = row.scores.categories.flatMap((c) => c.metrics).find((m) => m.id === "bytes");
    return bytes?.measured ? (bytes.cost ?? null) : null;
  }
  if (row.control && (key === "bannerVisible" || key === "bannerViewportCoverage")) return null;
  // No banner detected: coverage is unmeasured, not 0 % of the viewport.
  if (key === "bannerViewportCoverage" && row.values.bannerVisible === undefined) return null;
  return row.values[key as keyof Row["values"]] ?? null;
}

/** The (i) on an acronym column. `cursor:help`, and focusable so the tip is reachable by keyboard. */
function InfoDot({ label, tip }: { label: string; tip: string }) {
  return (
    <button
      type="button"
      className="info"
      aria-label={`What ${label} means`}
      aria-describedby={tip}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 11v5.5" />
        <circle cx="12" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

/* ── Hero chart ────────────────────────────────────────────────────────────
   Every chart compares points out of 100, never raw units: the overall score,
   then each of the four categories it is made of. One axis for all five means the
   bars are comparable as you switch, and a reader is never asked to hold two
   scales in their head. The measurement behind each point total is in the text
   alternative and in the table; the bar itself carries the points alone. */
type Chart = { key: string; label: string; weight?: number };
/**
 * The tabs: the overall score, then the categories of the method the rows were
 * scored under — read off the rows, so a run from an older method shows its own
 * categories rather than empty charts for today's.
 */
function chartsFor(rows: Row[]): Chart[] {
  const scored = rows.find((r) => !r.control && r.scores.categories.length > 0);
  const categories = scored?.scores.categories ?? INPUTS;
  return [
    { key: "score", label: "Overall score" },
    ...categories.map((c) => ({ key: c.id, label: c.label, weight: c.weight })),
  ];
}

/** The axis: 0 to 100 points, a rule every 20. The rule at 0 is the baseline. */
const CUTS = [0, 20, 40, 60, 80, 100];

/** Points for one chart: the overall score, or one input's sub-score. */
function points(row: Row, key: string): number | null {
  if (key === "score") return row.scores.overall === null ? null : roundScore(row.scores.overall);
  const input = row.scores.inputs.find((i) => i.id === key);
  return input?.score == null ? null : Math.round(input.score);
}
/** The measurements behind those points, each in its own unit, for the text alternative. */
function costOf(row: Row, chart: Chart): string | null {
  if (chart.key === "score") return null;
  const input = row.scores.inputs.find((i) => i.id === chart.key);
  if (!input?.measured) return null;
  return input.metrics
    .map((metric) => (metric.measured ? formatMetric(metric.cost, metric.unit) : "—"))
    .join(" · ");
}

function HeroChart({
  rows,
  chart,
  active,
  profile,
}: {
  rows: Row[];
  chart: Chart;
  active: boolean;
  profile: string;
}) {
  const items = rows
    .filter((r) => !r.control)
    .map((r) => ({ row: r, value: points(r, chart.key), cost: costOf(r, chart) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.row.app.localeCompare(b.row.app);
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value || a.row.app.localeCompare(b.row.app);
    });
  // Hue marks the one verdict the method defines, so it appears on the overall
  // score only; an input's points carry no band of their own.
  const band = chart.key === "score" ? (items[0]?.row.scores.band ?? "none") : "none";
  const text = items
    .map(
      (i) =>
        `${i.row.label}${i.row.package ? ` ${i.row.package}` : ""} ${
          i.value === null ? "not scored" : `${i.value} of 100`
        }${i.cost ? ` (${i.cost})` : ""}`,
    )
    .join("; ");
  return (
    <div className="chart" data-chart={chart.key} hidden={!active}>
      <div
        className="bars"
        role="img"
        aria-label={`${chart.label}${chart.weight ? `, ${Math.round(chart.weight * 100)}% of the score` : ""}, points out of 100, highest first: ${text}.`}
      >
        {/* Horizontal rules every 20 points, labelled in a gutter to the right
            of the plot so a bar is never crossed by its own axis. */}
        <div className="cuts" aria-hidden="true">
          {CUTS.map((at) => (
            <span key={at} className={`cut ${at === 0 ? "base" : ""}`} style={{ bottom: `${at}%` }}>
              <i>{at}</i>
            </span>
          ))}
        </div>
        <div className="bars-inner">
          {items.map((i, index) => (
            <span
              key={i.row.app}
              className={`bar ${i.value === null ? "none" : ""}`}
              data-tone={String(index + 1)}
              data-band={band}
            >
              {/* Measured: the number rides inside the top of its own bar. An
                  unmeasured bar is 8px of dashed rule, so its dash sits above. */}
              {i.value === null ? (
                <span className="val unmeasured">
                  <span aria-hidden="true">—</span>
                  <span className="cost">not measured</span>
                </span>
              ) : null}
              <span
                className="fill"
                style={{ height: `${i.value === null ? 0 : Math.max(1.5, i.value)}%` }}
              >
                {i.value === null ? null : (
                  <span className="val">
                    <span aria-hidden="true">{i.value}</span>
                  </span>
                )}
              </span>
            </span>
          ))}
        </div>
      </div>
      {/* The marks ride in their own row under the bars so they line up with
          each other and with the names beneath, rather than with the top of a
          bar, which moves with the value. */}
      <div className="bar-heads" aria-hidden="true">
        {items.map((i) => (
          <span key={i.row.app} className="bar-head">
            <Mark app={i.row.app} size="sm" />
          </span>
        ))}
      </div>
      <div className="bar-feet" aria-hidden="true">
        {items.map((i) => (
          <a
            key={i.row.app}
            className="bar-foot"
            href={detailHref(i.row.app, profile)}
            tabIndex={-1}
          >
            <span className="name">{i.row.label}</span>
            <span className="pkg">{shortSlug(i.row)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * The identifier under a bar. Twelve columns leave no room for a full scoped
 * package name, so the scope goes and a mode is kept: "nextjs", "react offline",
 * "CDN". The table beneath carries the exact package and version.
 */
function shortSlug(row: Row): string {
  if (!row.package)
    return row.installModel === "vendor-cdn" ? "CDN" : MODEL_LABEL[row.installModel];
  const name = row.package.split("/").pop() ?? row.package;
  return name.replace(/\s*\((.*) mode\)$/, " $1");
}

/** The identifier under a provider's name: the exact package and version, or how it is delivered. */
const slugOf = (row: Row) => (row.package ? row.version : MODEL_LABEL[row.installModel]);

/* ── One condition: chart + table. Served whole as a fragment for the non-default conditions. ── */
export function Results({
  rows: allRows,
  runId,
  slice,
  profiles,
}: {
  rows: Row[];
  runId: string;
  slice: Slice;
  profiles: string[];
}) {
  // The no-SDK control is the baseline every cost is measured against, not an
  // entry in the field, so it is stated on the method page rather than ranked
  // here. `allRows` still carries it: the scores were computed from it.
  const rows = allRows.filter((r) => !r.control);
  const charts = chartsFor(rows);
  const conditionText = `${slice.profile.replace("-", " ")} · ${slice.cache} cache · ${slice.percentile}`;
  const attrs = (row: Row) => ({
    "data-app": row.app,
    "data-control": String(row.control),
    "data-search":
      `${row.label} ${row.package ?? ""} ${MODEL_LABEL[row.installModel]}`.toLowerCase(),
    "data-values": JSON.stringify(
      Object.fromEntries(COLUMNS.map((c) => [c.key, cellValue(row, c.key)])),
    ),
  });
  const cellProps = (c: Column) => ({
    "data-metric": c.key,
    "data-priority": String(c.priority),
    "data-mobile": c.key === "bannerVisible" ? "true" : undefined,
  });
  return (
    <div
      className="results-region"
      data-condition={`${slice.profile}|${slice.cache}|${slice.percentile}`}
    >
      <div className="hero card chart-card">
        <div className="chart-head">
          <div className="chart-title">
            <h2 className="t-title" id="compare-h">
              Compare by
            </h2>
            <p className="t-body-sm secondary">Scores out of 100 · Higher is better</p>
            {/* The conditions sit with what they condition. */}
            <fieldset className="control-bar conditions" aria-label="Run conditions">
              <label className="t-label">
                Test profile
                <select disabled name="profile" defaultValue={slice.profile}>
                  {profiles.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="t-label">
                Percentile
                <select disabled name="percentile" defaultValue={slice.percentile}>
                  {["p50", "p75", "p95"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="t-label mobile-metric">
                Show
                <select disabled name="mobile-metric" defaultValue="bannerVisible">
                  {COLUMNS.filter((c) => c.key !== "score").map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>
          <fieldset className="chart-tabs" aria-labelledby="compare-h">
            {charts.map((c, i) => (
              <button
                key={c.key}
                type="button"
                className={`pill tap ${i === 0 ? "active" : ""}`}
                aria-pressed={i === 0}
                data-chart-tab={c.key}
                disabled
              >
                {c.label}
              </button>
            ))}
          </fieldset>
        </div>
        {charts.map((c, i) => (
          <HeroChart key={c.key} rows={rows} chart={c} active={i === 0} profile={slice.profile} />
        ))}
      </div>

      <section
        className="table-scroll card"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be keyboard-reachable (axe scrollable-region-focusable); the tabIndex is the accessibility fix, not a defect.
        tabIndex={0}
        aria-label="Leaderboard table; scrolls sideways"
      >
        <fieldset className="control-bar table-tools" aria-label="Table tools">
          <input
            className="search"
            type="search"
            name="query"
            placeholder="Search providers"
            aria-label="Search providers"
            disabled
          />
          <p role="status" className="t-label result-count">
            {rows.length} of {rows.length} installations
          </p>
          <p className="run-line run-summary t-body-sm">
            <span>
              Runs per integration: <span className="t-ident-sm">{rows[0]?.n ?? 20}</span>
            </span>
            <span aria-hidden="true">·</span>
            <a href="/methodology/#score">How scoring works</a>
            <span aria-hidden="true">·</span>
            <a href="/methodology/#run">View test setup</a>
          </p>
        </fieldset>
        <table className="lb">
          <caption className="sr-only">
            Run {runId}; {conditionText}. Sorted by score, highest first. Each value is the{" "}
            {slice.percentile} of {rows[0]?.n ?? 20} loads; intervals and every load are on the
            detail page.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="l rank-col">
                <span className="t-label">#</span>
              </th>
              <th scope="col" className="l sticky-1">
                <span className="t-label">Provider</span>
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  {...cellProps(c)}
                  className={`${c.lang ? "l" : ""} ${c.key === "score" ? "sticky-2" : ""}`}
                  aria-sort={c.key === "score" ? "descending" : "none"}
                >
                  <span
                    className={`def ${c.tipLeft || c.lang ? "l" : ""} ${c.term ? "has-info" : ""}`}
                  >
                    <button type="button" data-sort={c.key} data-dir={c.dir} disabled>
                      {c.label}
                      <span className="arrow" aria-hidden="true">
                        {c.key === "score" ? "↓" : ""}
                      </span>
                      <span className="sr-only">, select to sort</span>
                    </button>
                    {c.term ? <InfoDot label={c.label} tip={`tip-${c.key}`} /> : null}
                    <span className="tip" id={c.term ? `tip-${c.key}` : undefined} role="tooltip">
                      {c.term ? (
                        <>
                          <span className="tip-title">{c.term}</span>{" "}
                          <span className="tip-body">{c.define}</span>
                        </>
                      ) : (
                        c.define
                      )}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.app} {...attrs(row)}>
                <td className="l rank rank-col">{row.rank ? String(row.rank) : "—"}</td>
                <th scope="row" className="l sticky-1">
                  <span className="identity">
                    <Mark app={row.app} />
                    <span>
                      <a href={detailHref(row.app, slice.profile)}>{row.label}</a>
                      <span className="slug">{slugOf(row)}</span>
                    </span>
                  </span>
                </th>
                {COLUMNS.map((c) => {
                  const v = cellValue(row, c.key);
                  if (c.key === "score")
                    return (
                      <td key={c.key} {...cellProps(c)} className="sticky-2">
                        <ScoreChip scores={row.scores} words={false} />
                      </td>
                    );
                  return (
                    <td
                      key={c.key}
                      {...cellProps(c)}
                      className={v === null ? "unmeasured-cell" : ""}
                    >
                      <Value value={v} unit={c.unit ?? "ms"} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="empty-state t-body-sm" hidden>
        No published installation matches that search. A provider that is not benchmarked yet is a
        fact about this benchmark, not about the provider — see{" "}
        <a href="/methodology/#published">what is published</a>.
      </p>
    </div>
  );
}

/* ── The leaderboard section ─────────────────────────────────────────────── */
export function Leaderboard({
  slices,
  profiles,
  runId,
}: {
  slices: Record<string, Row[]>;
  profiles: string[];
  runId: string;
}) {
  const defaultKey = `${LEADERBOARD_SLICE.profile}|${LEADERBOARD_SLICE.cache}|${LEADERBOARD_SLICE.percentile}`;
  const rows = slices[defaultKey] ?? [];
  return (
    <section
      className="leaderboard region"
      aria-label="Leaderboard"
      data-run={runId}
      data-cols="auto"
      id="leaderboard"
    >
      <noscript>
        <p className="notice t-body-sm" style={{ marginTop: "var(--space-3)" }}>
          Showing {LEADERBOARD_SLICE.profile.replace("-", " ")}, {LEADERBOARD_SLICE.cache} cache,{" "}
          {LEADERBOARD_SLICE.percentile}. JavaScript enables sorting, search and the other
          conditions; every detail page works without it.
        </p>
      </noscript>
      {/* Only the default condition ships in the document. The others are served
          as fragments from app/slices/[run]/[slice]/route.ts and fetched by
          enhance.js the first time a reader selects one. */}
      <Results rows={rows} runId={runId} slice={LEADERBOARD_SLICE} profiles={profiles} />
    </section>
  );
}
