import { SITE_NAME, SITE_URL } from "@/lib/config";
import { FAQ } from "@/lib/faq";
import { METRICS } from "@/lib/metrics";
import type { Row } from "@/lib/ranking";
import type { RunManifest } from "@/lib/schema";
export function datasetLd(run: RunManifest, path = "/", rows?: Row[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${SITE_NAME} — ${run.runId}`,
    description:
      "What consent banners cost the pages they sit on: time to banner, first-paint delay, main-thread blocking, bytes and requests added, viewport coverage and time until the banner can be clicked, for published consent installations and a no-SDK control, scored against published anchors.",
    url: `${SITE_URL}${path}`,
    identifier: run.runId,
    creator: { "@type": "Organization", name: "CookieYes", url: "https://www.cookieyes.com" },
    dateCreated: run.startedAt,
    datePublished: run.finishedAt,
    temporalCoverage: `${run.startedAt}/${run.finishedAt}`,
    measurementTechnique:
      "Chromium lab measurements; throttled mobile and unthrottled desktop; cold cache; bytes read off the wire over the DevTools protocol; bootstrap confidence intervals",
    variableMeasured: METRICS.map((m) => ({
      "@type": "PropertyValue",
      name: m.description,
      unitText: m.unit,
    })),
    hasPart: (rows ?? run.apps.map((a) => ({ app: a.name, label: a.label }))).map((r) => ({
      "@type": "Dataset",
      name: r.label,
      url: `${SITE_URL}/cmp/${r.app}/`,
    })),
  };
}
export function itemListLd(rows: Row[], path = "/") {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Consent installations by score against published anchors",
    url: `${SITE_URL}${path}`,
    numberOfItems: rows.filter((r) => !r.control).length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: rows
      .filter((r) => !r.control)
      .map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${r.label}${r.package ? ` ${r.package}` : ""}`,
        url: `${SITE_URL}/cmp/${r.app}/`,
      })),
  };
}
export function faqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
