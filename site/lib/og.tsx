import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The cover, as a share card: five falling bars — the leader alone in the
 * band colour, every other rank in ink — then the name and one line. Colours
 * are the light-theme tokens; the image cannot read CSS variables.
 */
export function renderOg(
  title: string,
  value: string,
  caption: string,
  runId: string,
  band?: string,
) {
  const lead = band === "poor" ? "#d31517" : band === "fair" ? "#0c1b13" : "#39860e";
  const bars = [
    [lead, 1120],
    ["#0c1b13", 960],
    ["#5f6d65", 780],
    ["#7e8983", 560],
    ["#edf0ee", 340],
  ] as const;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#f9fbfa",
        color: "#0c1b13",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 0 }}>
        {bars.map(([color, width], i) => (
          <div
            key={String(i)}
            style={{
              display: "flex",
              height: 26,
              width,
              marginLeft: -10,
              background: color,
              borderRadius: 6,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "44px 56px 0" }}>
        <div style={{ display: "flex", fontSize: 22, color: "#5f6d65", letterSpacing: 1 }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 44 : 56,
            fontWeight: 600,
            letterSpacing: -1.5,
            marginTop: 14,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: value.length > 4 ? 40 : 84,
              fontWeight: 600,
              letterSpacing: value.length > 4 ? -1 : -3,
              color: value.length > 4 ? "#0c1b13" : lead,
            }}
          >
            {value}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5f6d65" }}>{caption}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 56,
          bottom: 40,
          fontSize: 18,
          color: "#7e8983",
        }}
      >
        Run {runId} · cookiebannerbench.com · published by CookieYes
      </div>
    </div>,
    OG_SIZE,
  );
}
