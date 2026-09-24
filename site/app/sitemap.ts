import type { MetadataRoute } from "next";
import { loadHistory, loadRun } from "@/data/source";
import { detailHref, SITE_URL } from "@/lib/config";
import { PUBLISHED } from "@/lib/published";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const run = loadRun();
  return [
    ...[
      "/",
      "/methodology/",
      "/about/",
      "/runs/",
      "/privacy/",
      ...PUBLISHED.flatMap((p) => run.profiles.map((profile) => detailHref(p.app, profile))),
    ].map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: run.finishedAt,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...loadHistory().map((r) => ({
      url: `${SITE_URL}/runs/${r.id}/`,
      lastModified: r.finishedAt,
      changeFrequency: "never" as const,
      priority: 0.5,
    })),
  ];
}
