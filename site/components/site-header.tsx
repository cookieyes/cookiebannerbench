import { ThemeToggle } from "@/components/theme-toggle";
import { GITHUB_URL, SITE_NAME } from "@/lib/config";
import { formatStars, githubStars } from "@/lib/github";

const NAV = [
  { href: "/", label: "Leaderboard" },
  { href: "/methodology/", label: "How we test" },
  { href: "/about/", label: "About" },
];

/**
 * 48px, sticky, surface, one hairline beneath. "How we test" sits here, not in
 * the footer: the site's claim is that everything can be checked, and the way
 * to check it has to be one click from every page.
 *
 * The current page carries `aria-current` and a 2px rule flush with the bar's
 * bottom edge. It is passed in by the page rather than read from the router so
 * the export keeps shipping no React to the browser.
 *
 * The repository link is icon-only: the supplied GitHub mark is a CSS mask
 * filled with `currentColor`, so it takes the nav link's ink in both themes.
 * Its star count is read at build time, so it costs visitors no request.
 */
export async function SiteHeader({ current }: { current?: string }) {
  const stars = await githubStars();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="/" className="wordmark" aria-label={`${SITE_NAME} home`}>
          {/* biome-ignore lint/performance/noImgElement: images are unoptimized in this static export and next/image lazy-loads by default, which shifts the top bar. */}
          <img
            className="logo logo-light"
            src="/brand/wordmark.png"
            alt=""
            width={186}
            height={28}
          />
          {/* biome-ignore lint/performance/noImgElement: see above. */}
          <img
            className="logo logo-dark"
            src="/brand/wordmark-dark.png"
            alt=""
            width={186}
            height={28}
          />
        </a>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>
              {n.label}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            rel="noopener"
            className={stars === null ? "nav-icon" : "nav-icon has-stars"}
            title="GitHub repository"
          >
            <span className="gh-mark" aria-hidden="true" />
            <span className="sr-only">GitHub repository</span>
            {stars !== null && (
              <span className="gh-stars">
                <span aria-hidden="true">★ {formatStars(stars)}</span>
                <span className="sr-only">, {stars} stars</span>
              </span>
            )}
          </a>
        </nav>
        <div className="tools">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
