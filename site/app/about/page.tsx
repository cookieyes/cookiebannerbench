import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Notice } from "@/components/ui";
import { GITHUB_URL, SITE_URL } from "@/lib/config";
import { FAQ } from "@/lib/faq";
import { faqLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About — who publishes this, and why it can be checked",
  description:
    "CookieYes publishes Cookiebannerbench and appears in it. What that means, how the site is built, and answers to the questions worth asking.",
  alternates: { canonical: `${SITE_URL}/about/` },
};

/**
 * The one script the site ships, measured rather than remembered. A page that
 * claims a budget and then quotes a stale number is exactly the failure this
 * benchmark is about, so the figure is read off the file at build time.
 */
const scriptKb = (
  gzipSync(readFileSync(join(process.cwd(), "public", "enhance.js"))).length / 1024
).toFixed(1);

export default function About() {
  return (
    <>
      <SiteHeader current="/about/" />
      <main id="main" className="page doc">
        <JsonLd data={faqLd()} />
        {/* The opening and the disclosure that belongs to it sit outside the
            numbered sequence; the sections proper begin at 01. */}
        <div className="lead">
          <section className="opening region wide">
            <h1 className="t-display">Why you can trust this benchmark</h1>
            <p className="lede t-body">
              CookieYes publishes this benchmark and appears in it. We fixed the test conditions
              before running anything, we state our affiliation wherever the results are presented,
              and every measurement is public so you can verify the results.
            </p>
            <p className="lede t-body">
              A benchmark is worth reading in proportion to how little its publisher stands to gain
              from the result. This one cannot claim independence, so it does the next thing: it
              fixes the anchors before the run, states the affiliation, publishes every load, and
              makes the site itself pass the bar it holds others to.
            </p>
          </section>

          <section className="region" aria-label="Publisher">
            <Notice title="CookieYes">
              We publish this site and appear in the results three times: as{" "}
              <code>@cookieyes/nextjs</code>, as <code>@cookieyes/react</code> and as our CDN
              script. No other provider in the list is affiliated with us. The affiliation is stated
              here and in the footer of every page.
            </Notice>
          </section>
        </div>

        <section className="region prose">
          <h2 className="t-title">Questions worth asking</h2>
          <dl>
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="t-section">{f.q}</dt>
                <dd className="t-body secondary" style={{ marginTop: "var(--space-1)" }}>
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="region prose">
          <h2 className="t-title">We test ourselves too</h2>
          <p className="t-body">
            This site is judged by the same standard it uses on everyone else. Every page is static
            HTML with {scriptKb} KB of JavaScript over the wire, self-hosted subset fonts, no
            analytics and no third-party requests. Continuous integration fails if any route scores
            below 100 in every Lighthouse category or trips a single accessibility rule. The
            harness, the test apps and the site all live in <a href={GITHUB_URL}>one repository</a>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
