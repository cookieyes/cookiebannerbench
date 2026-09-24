import { Pill } from "@/components/ui";
import { formatMetric } from "@/lib/metrics";
import type { Row } from "@/lib/ranking";
import { BAND_WORD, BANDS, type Band, roundScore, type Scores } from "@/lib/scoring";

/* Every chart states its values in a text alternative. A picture of a
   composition with no alternative is not a disclosure. */

/* ── Score ring: arc length is weight, fill is sub-score ─────────────────── */
const R = 66;
const STROKE = 15;
const GAP = 8;
const C = 2 * Math.PI * R;

export function ScoreRing({ scores, band: line }: { scores: Scores; band: string }) {
  const score = scores.overall;
  const band = scores.band as Band | null;
  let offset = 0;
  const segments = scores.categories.map((sub) => {
    const seg = sub.weight * C - GAP;
    const start = offset;
    offset += sub.weight * C;
    return { seg, start, sub };
  });
  const label =
    score === null
      ? "Not scored. This is the no-SDK control."
      : `Score ${roundScore(score)} of 100, ${BAND_WORD[band ?? "fair"]}${scores.provisional ? ", provisional" : ""}. ${segments
          .map((s) =>
            s.sub.score === null
              ? `${s.sub.label.toLowerCase()} not measured`
              : `${s.sub.label.toLowerCase()} ${Math.round(s.sub.score)} at ${Math.round(s.sub.weight * 100)}% weight`,
          )
          .join("; ")}.`;
  return (
    <div className="score-ring-wrap">
      <div className="score-ring" role="img" aria-label={label}>
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <g transform="rotate(-90 90 90)" fill="none" strokeWidth={STROKE} strokeLinecap="butt">
            {segments.map((s) => (
              <circle
                key={`t-${s.sub.id}`}
                className="track"
                cx="90"
                cy="90"
                r={R}
                strokeDasharray={`${s.seg.toFixed(1)} ${(C - s.seg).toFixed(1)}`}
                strokeDashoffset={(-s.start).toFixed(1)}
              />
            ))}
            {segments.map((s) =>
              s.sub.score === null || band === null ? null : (
                <circle
                  key={`a-${s.sub.id}`}
                  className={`arc ${band}`}
                  cx="90"
                  cy="90"
                  r={R}
                  strokeDasharray={`${((s.seg * s.sub.score) / 100).toFixed(1)} ${(C - (s.seg * s.sub.score) / 100).toFixed(1)}`}
                  strokeDashoffset={(-s.start).toFixed(1)}
                />
              ),
            )}
          </g>
        </svg>
        <div className="mid">
          <span className={`t-score score-num ${band ?? "none"}`}>
            {score === null ? "—" : roundScore(score)}
          </span>
          <span className={`band-line ${score === null ? "" : (band ?? "")}`}>{line}</span>
        </div>
      </div>
    </div>
  );
}

/* ── The score's four categories, beside the ring ─────────────────────────
   Label, the weight it carries, and the points it scored. The arithmetic is
   on the method page; this is the reading of it for one installation. */
export function ScoreTable({ scores, condition }: { scores: Scores; condition: string }) {
  return (
    <div className="score-table">
      <div className="head">
        <span className="t-ident-sm secondary">{condition}</span>
      </div>
      <div className="row cols">
        <span className="t-label">Category</span>
        <span className="t-label">Weightage</span>
        <span className="t-label">Score</span>
      </div>
      {scores.categories.map((sub) => {
        const measured = sub.score !== null;
        return (
          <div className="row" key={sub.id}>
            <span className="lbl t-body">{sub.label}</span>
            <span className="w">
              <Pill>{Math.round(sub.weight * 100)} %</Pill>
            </span>
            <span className={`sub t-data-lg ${measured ? "" : "unmeasured"}`}>
              {measured ? Math.round(sub.score ?? 0) : "—"}
              {measured ? null : <span className="sr-only">not measured</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Run distribution: every load plotted, the median filled ─────────────── */
export function RunDistribution({
  values,
  expected,
  label,
}: {
  values: number[];
  expected: number;
  label: string;
}) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length)
    return (
      <div className="card dist">
        <div className="t-label">{label}</div>
        <p className="t-body-sm unmeasured" style={{ marginTop: 10 }}>
          Not measured in any of the {expected} loads.
        </p>
      </div>
    );
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? min;
  const median = sorted[Math.floor((sorted.length - 1) / 2)] ?? min;
  const pos = (v: number) => (max === min ? 50 : ((v - min) / (max - min)) * 100);
  const completed =
    sorted.length === expected
      ? `${expected} loads`
      : `${sorted.length} of ${expected} loads completed`;
  return (
    <div className="card dist">
      <div className="t-label">
        {completed} · {label}
      </div>
      <div
        className="plot"
        role="img"
        aria-label={`${sorted.length} loads, ${formatMetric(min, "ms")} to ${formatMetric(max, "ms")}, median ${formatMetric(median, "ms")}.`}
      >
        <div className="ax" />
        {sorted.map((v, i) =>
          v === median && i === Math.floor((sorted.length - 1) / 2) ? null : (
            // biome-ignore lint/suspicious/noArrayIndexKey: loads are an ordered, static list with repeated values; the index is the identity.
            <div key={i} className="d" style={{ left: `${pos(v)}%` }} />
          ),
        )}
        <div className="m" style={{ left: `${pos(median)}%` }} />
      </div>
      <div className="scale">
        <span>{formatMetric(min, "ms")}</span>
        <span>
          <b>median {formatMetric(median, "ms")}</b>
        </span>
        <span>{formatMetric(max, "ms")}</span>
      </div>
    </div>
  );
}

/* ── Position in the field: this score against every other, on 0–100 ────── */
export function FieldStrip({ row, rows }: { row: Row; rows: Row[] }) {
  const scored = rows.filter((r) => !r.control && r.scores.overall !== null);
  const mine = row.scores.overall;
  const others = scored.filter((r) => r.app !== row.app);
  const values = scored.map((r) => roundScore(r.scores.overall ?? 0));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const label =
    mine === null
      ? `Not scored. The field runs from ${lo} to ${hi} across ${scored.length} installations.`
      : `Score ${roundScore(mine)} of 100; the field runs from ${lo} to ${hi} across ${scored.length} installations. Bands at ${BANDS.fair} and ${BANDS.good}.`;
  return (
    <div className="card field">
      <div className="t-label">Where it sits in the field · {scored.length} installations</div>
      <div className="strip" role="img" aria-label={label}>
        <div className="ax" />
        <div className="cut" style={{ left: `${BANDS.fair}%` }}>
          <span>{BANDS.fair}</span>
        </div>
        <div className="cut" style={{ left: `${BANDS.good}%` }}>
          <span>{BANDS.good}</span>
        </div>
        {others.map((r) => (
          <div
            key={r.app}
            className="tick"
            style={{ left: `${roundScore(r.scores.overall ?? 0)}%` }}
          />
        ))}
        {mine === null ? null : (
          <div className={`me ${row.scores.band ?? ""}`} style={{ left: `${roundScore(mine)}%` }} />
        )}
      </div>
      <div className="scale">
        <span>0</span>
        {mine === null ? (
          <span>Poor · Fair · Good</span>
        ) : (
          <span className={`me-label ${row.scores.band ?? ""}`}>
            this provider · {roundScore(mine)}
          </span>
        )}
        <span>100</span>
      </div>
    </div>
  );
}

/* ── Waterfall: how the banner lands ──────────────────────────────────────
   A browser network panel read for one page load. Three things on it are
   measured and exact — first paint, LCP, the control's LCP, and the moment
   the banner became visible. The phase bars between them are interpolation:
   we know when each phase ended, not when the browser handed one to the next,
   so the hand-overs are drawn to fixed fractions of first paint and the bars
   are shaped, never claimed. That is why the lane ends carry durations and
   the event lines carry the measurements.

   The ratio the fetch and the execution split the remaining span by; taken
   from the design, where execution is drawn 35% longer than the fetch. */
const EXEC_OVER_REQ = 1.35;
/** Hand-over points, as fractions of first paint. */
const REQ_START = 0.55;
const EXEC_START = 0.6;
/** Execution is drawn as finishing just before the banner paints. */
const EXEC_END = 0.97;
/** Nice ruler steps, in ms; the first one that fits in six divisions wins. */
const STEPS = [10, 25, 50, 100, 250, 500, 1000, 2000, 2500, 5000, 10000, 25000];

function ruler(rawMax: number) {
  const step = STEPS.find((s) => Math.ceil(rawMax / s) <= 6) ?? STEPS[STEPS.length - 1];
  const divisions = Math.max(1, Math.ceil(rawMax / (step as number)));
  return { max: (step as number) * divisions, divisions };
}

export function Waterfall({ row, control }: { row: Row; control?: Row | undefined }) {
  const fp = row.values.fcp ?? null;
  const lcp = row.values.lcp ?? null;
  const banner = row.control ? null : (row.values.bannerVisible ?? null);
  const controlLcp = row.control ? null : (control?.values.lcp ?? null);
  const band = row.scores.band ?? "";
  // A vendor script is an extra request the page would not otherwise make; a
  // bundled package is already in the document's own payload.
  const fetched = row.installModel === "vendor-cdn" || row.installModel === "hosted-backend";

  const rawMax = Math.max(fp ?? 0, lcp ?? 0, banner ?? 0, controlLcp ?? 0, 1);
  const { max, divisions } = ruler(rawMax);
  const pc = (v: number) => `${((v / max) * 100).toFixed(3)}%`;

  // Phase geometry. Everything is clamped into the ruler so a bar can never
  // run past the plot even when the anchors are out of their usual order.
  const at = (v: number) => Math.min(Math.max(v, 0), max);
  const paint = at(fp ?? 0);
  const bannerAt = banner === null ? null : at(banner);
  const execEnd = at((bannerAt ?? paint) * EXEC_END);
  const reqStart = at(paint * REQ_START);
  const execStartPlain = at(paint * EXEC_START);
  const span = Math.max(0, execEnd - reqStart);
  const reqWidth = fetched ? span / (1 + EXEC_OVER_REQ) : 0;
  const execStart = fetched ? reqStart + reqWidth : execStartPlain;
  const execWidth = Math.max(0, execEnd - execStart);

  const events = [
    controlLcp === null
      ? null
      : {
          key: "ctl",
          at: at(controlLcp),
          label: `control LCP ${formatMetric(controlLcp, "ms")}`,
          ctl: true,
        },
    fp === null
      ? null
      : { key: "fp", at: paint, label: `first paint ${formatMetric(fp, "ms")}`, ctl: false },
    lcp === null
      ? null
      : { key: "lcp", at: at(lcp), label: `LCP ${formatMetric(lcp, "ms")}`, ctl: false },
  ].filter((e): e is NonNullable<typeof e> => e !== null);
  // Two tags whose labels would overprint are read as one. The test is the
  // width of the earlier label, not a fixed gap: "control LCP 362 ms" needs
  // four times the room "LCP 1.4 s" does, and a fixed gap lets the long one
  // run straight through its neighbour. DM Mono at 10px is ≈6.2px per
  // character plus the tag's 6px inset, over a plot ≈1032px wide at the width
  // this page is laid out for.
  const PLOT = 1032;
  const room = (label: string) => ((label.length * 6.2 + 8) / PLOT) * max;
  const groups: { at: number; label: string; ctl: boolean }[] = [];
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const last = groups[groups.length - 1];
    if (last && e.at - last.at < room(last.label)) {
      last.label = `${last.label} · ${e.label}`;
      last.at = e.at;
      last.ctl = last.ctl && e.ctl;
    } else groups.push({ at: e.at, label: e.label, ctl: e.ctl });
  }

  const lanes = [
    {
      key: "doc",
      label: "Document",
      end: fp === null ? "—" : formatMetric(fp, "ms"),
      note: "to first paint",
      bars:
        fp === null
          ? []
          : [
              { cls: "bar wait", left: 0, width: paint * 0.3 },
              { cls: "bar", left: paint * 0.3, width: paint * 0.7 },
            ],
    },
    {
      key: "req",
      label: "Consent request",
      end: fetched ? formatMetric(reqWidth, "ms") : "—",
      note: fetched ? "vendor script" : "no extra request",
      bars: fetched ? [{ cls: "bar req", left: reqStart, width: reqWidth }] : [],
      none: fetched ? null : "none · in the bundle",
    },
    {
      key: "exec",
      label: "Script executes",
      end: formatMetric(execWidth, "ms"),
      note: "consent layer",
      bars: [{ cls: `bar exec ${band}`, left: execStart, width: execWidth }],
    },
    {
      key: "banner",
      label: "Banner visible",
      end: banner === null ? "—" : formatMetric(banner, "ms"),
      note: banner === null ? "no banner detected" : "from navigation start",
      bars: [],
      mark: bannerAt,
    },
  ];

  const later =
    lcp !== null && controlLcp !== null
      ? `${formatMetric(Math.abs(lcp - controlLcp), "ms")} ${lcp >= controlLcp ? "later" : "earlier"} than the control`
      : "no control on this condition";
  const coverage = row.values.bannerViewportCoverage;
  const label = [
    `document first paint ${fp === null ? "not measured" : formatMetric(fp, "ms")}`,
    fetched
      ? `consent request ${formatMetric(reqWidth, "ms")}`
      : "consent request none, in the bundle",
    `script executes ${formatMetric(execWidth, "ms")}`,
    `banner visible ${banner === null ? "not detected" : formatMetric(banner, "ms")}`,
    `largest paint ${lcp === null ? "not measured" : formatMetric(lcp, "ms")}${controlLcp === null ? "" : `, control ${formatMetric(controlLcp, "ms")}`}`,
  ].join("; ");

  return (
    <div className="card timeline wf">
      <div className="t-label">How the banner lands · p75 load</div>
      <div className="ruler" aria-hidden="true">
        <span />
        <div className="ticks">
          {Array.from({ length: divisions + 1 }, (_, i) => (max * i) / divisions).map((v) => (
            <span key={v} style={{ left: `${((v / max) * 100).toFixed(3)}%` }}>
              {v === 0 ? "0" : formatMetric(v, "ms")}
            </span>
          ))}
        </div>
        <span />
      </div>
      <div className="events" aria-hidden="true">
        <span />
        <div className="tags">
          {groups.map((g) => (
            <span
              key={g.label}
              className={`${g.ctl ? "ctl" : ""}${g.at / max > 0.6 ? " flip" : ""}`}
              style={{ left: pc(g.at) }}
            >
              {g.label}
            </span>
          ))}
        </div>
        <span />
      </div>
      <div className="lanes" role="img" aria-label={`How the banner lands, p75 load: ${label}.`}>
        <div className="gridlines" aria-hidden="true">
          {Array.from({ length: divisions - 1 }, (_, i) => (max * (i + 1)) / divisions).map((v) => (
            <i key={v} style={{ left: pc(v) }} />
          ))}
          {events.map((e) => (
            <i key={e.key} className={`ev ${e.ctl ? "ctl" : ""}`} style={{ left: pc(e.at) }} />
          ))}
        </div>
        {lanes.map((lane) => (
          <div className="lane" key={lane.key}>
            <span className="lbl">{lane.label}</span>
            <div className="track">
              {lane.bars.map((b, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a lane's bars are a fixed, ordered pair; the index is the identity.
                <i key={i} className={b.cls} style={{ left: pc(b.left), width: pc(b.width) }} />
              ))}
              {"none" in lane && lane.none ? (
                <span className="none" style={{ left: `calc(${pc(paint)} + 8px)` }}>
                  {lane.none}
                </span>
              ) : null}
              {"mark" in lane && lane.mark !== null && lane.mark !== undefined ? (
                <i className={`mark ${band}`} style={{ left: pc(lane.mark) }} />
              ) : null}
            </div>
            <span className="end t-data">
              <span className="v">{lane.end}</span>
              <span className="secondary">{lane.note}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="foot">
        <span>
          <b>LCP {lcp === null ? "—" : formatMetric(lcp, "ms")}</b> · {later}
        </span>
        <span>
          <b>banner {banner === null ? "—" : formatMetric(banner, "ms")}</b> ·{" "}
          {coverage === undefined || banner === null
            ? "no banner detected"
            : `covers ${(coverage * 100).toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}
