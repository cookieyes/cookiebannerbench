import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The site mark (app/icon.svg) as a PNG, for the places that will not take an
 * SVG: the apple-touch-icon and the /favicon.ico older clients ask for.
 */
export function renderIcon(size: number) {
  const svg = readFileSync(join(process.cwd(), "app", "icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: rendered by next/og, not the browser. */}
      <img src={src} width={size} height={size} alt="" />
    </div>,
    { width: size, height: size },
  );
}
