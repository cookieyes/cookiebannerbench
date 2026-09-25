import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { loadHistory } from "@/data/source";
import { formatDate } from "@/lib/metrics";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Run history",
  description:
    "Every recorded run, with its date, target count, published installations and loads per condition.",
  path: "/runs/",
});

export default function Runs() {
  const runs = loadHistory();
  return (
    <>
      <SiteHeader />
      <main id="main" className="page">
        <section className="opening region">
          <h1 className="t-display">Every run keeps its date.</h1>
          <p className="lede t-body">
            Results are snapshots. Open a run to see the published installations measured then, with
            its original conditions and values. Target count covers the full harness run; the
            published count applies today's inclusion rule. Scores are only computed for runs that
            included the no-SDK control.
          </p>
        </section>
        <section
          className="region card mini-wrap"
          style={{ padding: "var(--space-3) var(--space-3) 0" }}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be keyboard-reachable (axe scrollable-region-focusable); the tabIndex is the accessibility fix, not a defect.
          tabIndex={0}
          aria-label="Run history; scrolls sideways"
        >
          <table className="runs t-body">
            <caption className="sr-only">
              Every results directory, with date, total targets, published installations and loads
              per condition.
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="t-label">Run</span>
                </th>
                <th scope="col" className="r">
                  <span className="t-label">Targets</span>
                </th>
                <th scope="col" className="r">
                  <span className="t-label">Published</span>
                </th>
                <th scope="col" className="r">
                  <span className="t-label">Loads / condition</span>
                </th>
                <th scope="col" className="r">
                  <span className="t-label">Method</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <th scope="row" style={{ textAlign: "left", fontWeight: 500 }}>
                    <a href={`/runs/${r.id}/`}>{formatDate(r.finishedAt)}</a>
                    <span className="t-ident-sm tertiary" style={{ display: "block" }}>
                      {r.id}
                    </span>
                  </th>
                  <td className="r t-data">{r.targets}</td>
                  <td className="r t-data">{r.published}</td>
                  <td className="r t-data">{r.iterations}</td>
                  <td className="r">
                    <span className="pill">v{r.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
