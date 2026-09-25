import { INDEXABLE, SITE_URL } from "@/lib/config";

// Required by `output: "export"` — this route is generated at build time.
export const dynamic = "force-static";

/**
 * robots.txt, written out rather than through MetadataRoute.Robots because that
 * type has no field for Content Signals (contentsignals.org). Search follows
 * INDEXABLE, so it always agrees with the robots meta tag; AI tools may read
 * the pages to answer a question, but not train on them. Crawling stays
 * allowed so crawlers can see the noindex tag while there is one.
 */
export function GET() {
  const body = [
    "User-Agent: *",
    `Content-Signal: search=${INDEXABLE ? "yes" : "no"}, ai-input=yes, ai-train=no`,
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
