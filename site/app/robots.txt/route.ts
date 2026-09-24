import { SITE_URL } from "@/lib/config";

// Required by `output: "export"` — this route is generated at build time.
export const dynamic = "force-static";

/**
 * robots.txt, written out rather than through MetadataRoute.Robots because that
 * type has no field for Content Signals (contentsignals.org). Search is off to
 * agree with the site-wide noindex; AI tools may read the pages to answer a
 * question, but not train on them. Crawling stays allowed so crawlers can see
 * the noindex tag.
 */
export function GET() {
  const body = [
    "User-Agent: *",
    "Content-Signal: search=no, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
