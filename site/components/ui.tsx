import type { ReactNode } from "react";
import { parts, type Unit } from "@/lib/metrics";
import type { PublishedTarget } from "@/lib/published";
import { publishedTarget } from "@/lib/published";
import { BAND_WORD, type Band, roundScore, type Scores } from "@/lib/scoring";

/** A value with its unit set apart. Unmeasured renders a dash with a text equivalent, never a zero. */
export function Value({
  value,
  unit,
  className = "",
  size,
}: {
  value: number | null | undefined;
  unit: Unit;
  className?: string;
  size?: "lg";
}) {
  const p = parts(value, unit);
  const missing = p.value === "—";
  return (
    <span
      className={`v ${size === "lg" ? "t-data-lg" : ""} ${missing ? "unmeasured" : ""} ${className}`}
    >
      {missing ? <span aria-hidden="true">—</span> : p.value}
      {missing ? <span className="sr-only">not measured</span> : null}
      {p.unit ? <span className="u">{p.unit}</span> : null}
    </span>
  );
}

/** Neutral filled capsule in the mono. Never a band colour. */
export function Pill({
  children,
  active,
  unmeasured,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  unmeasured?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`pill ${active ? "active" : ""} ${unmeasured ? "unmeasured" : ""} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The provider's own mark, on a plate. Identity, never judgement — a mark may be
 * as loud as the brand, and it is the only hue in a row besides the score.
 *
 * The plate is what makes that safe in both themes: a dark mark on `ink-950`
 * would vanish, so every mark sits on a fixed light plate (states-and-access).
 * A plain <img>, eager, with an explicit box: these are above the fold in every
 * row and a lazy image arriving late would shift the layout.
 */
export function Mark({ app, size }: { app: string | PublishedTarget; size?: "sm" | "lg" }) {
  const entry = typeof app === "string" ? publishedTarget(app) : app;
  if (!entry) return null;
  const control = entry.installModel === "control";
  // The mark fills its plate edge to edge (see .mark img); the attributes are
  // the plate's own box so the row never reflows when the image lands.
  const box = size === "lg" ? 40 : size === "sm" ? 24 : 32;
  return (
    <span className={`mark ${size ?? ""} ${control ? "control" : ""}`} aria-hidden="true">
      {control ? (
        <span>—</span>
      ) : (
        // biome-ignore lint/performance/noImgElement: images are unoptimized in this static export and next/image lazy-loads by default, which shifts the above-the-fold layout.
        <img
          src={`/logos/${entry.vendor}.png`}
          width={box}
          height={box}
          alt=""
          loading="eager"
          decoding="async"
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </span>
  );
}

/**
 * The score as it appears in a row: the numeral in its band colour, with the
 * band word beneath it. In the leaderboard table the colour already carries the
 * band and a word under every row is noise, so `words={false}`
 * drops it to a text equivalent — read aloud, never drawn.
 */
export function ScoreChip({
  scores,
  align = "end",
  words = true,
}: {
  scores: Scores;
  align?: "end" | "start";
  words?: boolean;
}) {
  const score = scores.overall;
  if (score === null)
    return (
      <span
        className="score-chip"
        style={{ alignItems: align === "start" ? "flex-start" : undefined }}
      >
        <span className="score-num none">
          <span aria-hidden="true">—</span>
          <span className="sr-only">not scored</span>
        </span>
        {words ? <span className="band-word">Not scored</span> : null}
      </span>
    );
  const band = scores.band as Band;
  return (
    <span
      className="score-chip"
      style={{ alignItems: align === "start" ? "flex-start" : undefined }}
    >
      <span className={`score-num ${band}`}>{roundScore(score)}</span>
      {words ? (
        <span className={`band-word ${scores.provisional ? "" : band}`}>
          {scores.provisional ? "Provisional" : BAND_WORD[band]}
          {scores.provisional ? <span className="sr-only">, {BAND_WORD[band]}</span> : null}
        </span>
      ) : (
        <span className="sr-only">
          {BAND_WORD[band]}
          {scores.provisional ? ", provisional" : ""}
        </span>
      )}
    </span>
  );
}

/** One measurement, its unit, and one line about how it was arrived at. */
export function MetricCard({
  label,
  icon,
  value,
  unit,
  sub,
  text,
}: {
  label: string;
  icon?: ReactNode;
  value?: number | null | undefined;
  unit?: Unit | undefined;
  sub: string;
  /** A non-numeric value, for reported facts. */
  text?: string | undefined;
}) {
  return (
    <div className="card metric-card">
      <div className="t-label">
        {icon}
        {label}
      </div>
      <div className="value">
        {text !== undefined ? (
          <span className="t-data-lg">{text}</span>
        ) : (
          <Value value={value} unit={unit ?? "ms"} size="lg" />
        )}
      </div>
      <div className="sub">{sub}</div>
    </div>
  );
}

/** Inline block about the data or our own software. Neutral by default; amber only for our own reporting. */
export function Notice({
  variant = "neutral",
  title,
  children,
}: {
  variant?: "neutral" | "warning";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`notice ${variant}`} role={variant === "warning" ? "note" : undefined}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        {title ? <b>{title} </b> : null}
        {children}
      </div>
    </div>
  );
}

/* Lucide-style line icons, 1.5px stroke, round caps. */
const icon = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);
export const ICONS = {
  clock: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  download: icon(<path d="M12 4v10M8 11l4 4 4-4M5 19h14" />),
  shift: icon(<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />),
  viewport: icon(
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 14h16" />
    </>,
  ),
  paint: icon(
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M10 10v10" />
    </>,
  ),
  cpu: icon(
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>,
  ),
  scale: icon(
    <>
      <path d="M12 3v18M5 7h14" />
      <path d="M5 7l-3 7a3 3 0 0 0 6 0L5 7ZM19 7l-3 7a3 3 0 0 0 6 0l-3-7Z" />
    </>,
  ),
  eye: icon(
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
};
