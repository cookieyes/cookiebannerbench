import { GITHUB_URL, LICENSE_URL, SITE_NAME, SITE_URL } from "@/lib/config";
import { FAQ } from "@/lib/faq";
import { METRICS } from "@/lib/metrics";
import type { Row } from "@/lib/ranking";
import type { RunManifest } from "@/lib/schema";

/** Stable node ids, so pages refer to one publisher and one parent dataset. */
const PUBLISHER_ID = `${SITE_URL}/#publisher`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const DATASET_ID = `${SITE_URL}/#dataset`;

const DESCRIPTION =
  "What consent banners cost the pages they sit on: time to banner, first-paint delay, main-thread blocking, bytes and requests added, viewport coverage and time until the banner can be clicked, for published consent installations and a no-SDK control, scored against published anchors.";
const KEYWORDS = [
  "cookie banner",
  "consent management platform",
  "CMP",
  "web performance",
  "benchmark",
  "Core Web Vitals",
];
// Named in full wherever it is referenced: an id alone only resolves on the one
// page that also carries the Organization node.
const publisherRef = {
  "@type": "Organization",
  "@id": PUBLISHER_ID,
  name: "CookieYes",
  url: "https://www.cookieyes.com",
};
const parentRef = {
  "@type": "Dataset",
  "@id": DATASET_ID,
  name: `${SITE_NAME} cookie banner performance benchmark results`,
  url: `${SITE_URL}/`,
};

/** Terms every dataset on the site shares: the MIT licence, the publisher, the method. */
function common(run: RunManifest) {
  return {
    license: LICENSE_URL,
    isAccessibleForFree: true,
    keywords: KEYWORDS,
    creator: publisherRef,
    publisher: publisherRef,
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
  };
}

/** The run's full results file, as committed to the public repository. */
const runDownload = (run: RunManifest) => ({
  "@type": "DataDownload",
  encodingFormat: "application/json",
  contentUrl: `https://raw.githubusercontent.com/cookieyes/cookiebannerbench/main/results/${run.runId}/run.json`,
});

/** The homepage: the benchmark as a whole, parent of every installation's dataset. */
export function benchmarkDatasetLd(run: RunManifest, rows: Row[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": DATASET_ID,
    name: parentRef.name,
    description: DESCRIPTION,
    url: `${SITE_URL}/`,
    identifier: run.runId,
    ...common(run),
    distribution: [runDownload(run)],
    hasPart: rows.map((r) => ({ "@id": `${SITE_URL}/cmp/${r.app}/#dataset` })),
  };
}

/** A recorded run, as its own snapshot of the benchmark. */
export function runDatasetLd(run: RunManifest, date: string) {
  const url = `${SITE_URL}/runs/${run.runId}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `${SITE_NAME} run of ${date}: cookie banner benchmark results`,
    description: `${DESCRIPTION} Recorded in run ${run.runId}.`,
    url,
    identifier: run.runId,
    isPartOf: parentRef,
    ...common(run),
    distribution: [runDownload(run)],
  };
}

/** One installation on one test profile, with the raw trace it was summarised from. */
export function installDatasetLd(run: RunManifest, app: string, path: string, name: string) {
  const url = `${SITE_URL}${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name,
    description: `${name}: ${DESCRIPTION.charAt(0).toLowerCase()}${DESCRIPTION.slice(1)} Run ${run.runId}.`,
    url,
    identifier: `${run.runId}/${app}`,
    isPartOf: parentRef,
    ...common(run),
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_URL}/cmp/${app}/trace.json`,
      },
    ],
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

/** The publisher and the site, once, on the homepage. */
export function siteLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...publisherRef,
        legalName: "CookieYes Limited",
        sameAs: [
          "https://github.com/cookieyes",
          "https://www.npmjs.com/org/cookieyes",
          "https://developers.cookieyes.com/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: "en",
        publisher: publisherRef,
        license: LICENSE_URL,
        sameAs: [GITHUB_URL],
      },
    ],
  };
}

/** The trail the page shows above its heading, and nothing it does not. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function methodologyLd(datePublished: string, dateModified: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How we test cookie banner performance",
    url: `${SITE_URL}/methodology/`,
    inLanguage: "en",
    author: publisherRef,
    publisher: publisherRef,
    isPartOf: { "@type": "WebSite", "@id": WEBSITE_ID, name: SITE_NAME, url: `${SITE_URL}/` },
    about: parentRef,
    datePublished,
    dateModified,
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
