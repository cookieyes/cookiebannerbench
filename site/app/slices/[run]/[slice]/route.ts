import { renderToReadableStream } from "react-dom/server.edge";
import { Results } from "@/components/leaderboard";
import { runIds } from "@/data/source";
import { DEFAULT_SLICE } from "@/lib/config";
import { leaderboardData } from "@/lib/page-data";
import type { Slice } from "@/lib/ranking";

/**
 * Leaderboard condition fragments: /slices/<run>/<profile>_<cache>_<percentile>.html
 *
 * The document ships only the default condition. The other eleven are the same
 * server-rendered `Results` markup, exported here as standalone HTML fragments
 * so that switching profile / cache / percentile is one fetch and one
 * `replaceWith` in enhance.js — no client-side templating, and nothing inert
 * inflating the page. Namespaced by run because the run-history pages render
 * the leaderboard for earlier runs.
 */

export const dynamic = "force-static";

const DEFAULT_KEY = `${DEFAULT_SLICE.profile}|${DEFAULT_SLICE.cache}|${DEFAULT_SLICE.percentile}`;
const toFile = (key: string) => `${key.replaceAll("|", "_")}.html`;
const fromFile = (file: string) => file.replace(/\.html$/, "").replaceAll("_", "|");

export function generateStaticParams() {
  return runIds().flatMap((run) =>
    Object.keys(leaderboardData(run).slices)
      .filter((key) => key !== DEFAULT_KEY)
      .map((key) => ({ run, slice: toFile(key) })),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ run: string; slice: string }> },
) {
  const { run, slice } = await params;
  const key = fromFile(slice);
  const { run: manifest, slices } = leaderboardData(run);
  const rows = slices[key];
  if (!rows || key === DEFAULT_KEY) return new Response("Not found", { status: 404 });
  const [profile = "", cache = "", percentile = "p75"] = key.split("|");
  // The streaming API is the one Next permits inside the app directory; the
  // stream is awaited to completion so the export is a plain file.
  const stream = await renderToReadableStream(
    Results({
      rows,
      runId: run,
      slice: { profile, cache, percentile: percentile as Slice["percentile"] },
      profiles: manifest.profiles,
    }),
  );
  await stream.allReady;
  const html = await new Response(stream).text();
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
