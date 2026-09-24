import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page">
        <section className="opening region">
          <p className="t-label">Not found</p>
          <h1 className="t-display" style={{ marginTop: "var(--space-3)" }}>
            This result is not published.
          </h1>
          <p className="lede t-body">
            A provider that is not benchmarked yet is a fact about this benchmark, not about the
            provider. The <a href="/">leaderboard</a> lists everything that is; the{" "}
            <a href="/methodology/#published">method page</a> says what qualifies.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
