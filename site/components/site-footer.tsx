import { GITHUB_URL, SITE_NAME } from "@/lib/config";

const columns = [
  {
    title: "Benchmark",
    links: [
      ["Leaderboard", "/"],
      ["About", "/about/"],
    ],
  },
  {
    title: "How we test",
    links: [
      ["Scoring model", "/methodology/#tab-scoring"],
      ["What is published", "/methodology/#tab-published"],
      ["Known limits", "/methodology/#tab-limits"],
    ],
  },
  {
    title: "Project",
    links: [
      ["Repository", GITHUB_URL],
      ["Issues", `${GITHUB_URL}/issues`],
      ["npm packages", "https://www.npmjs.com/org/cookieyes"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["MIT licence", `${GITHUB_URL}/blob/main/LICENSE`],
      ["Privacy policy", "/privacy/"],
    ],
  },
];

/**
 * The name at display size, drawn as a halftone of the same dot grid the charts
 * sit on. SVG text rather than an HTML heading: it is decoration, it must not
 * enter the reading order or the heading outline, and `textLength` pins its
 * width to the viewBox so it can never overflow whatever the font does.
 */
function FooterWordmark() {
  return (
    <svg
      className="footer-wordmark"
      viewBox="0 0 1200 170"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="fw-dots" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <text
        x="600"
        y="140"
        textLength="1180"
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        fill="url(#fw-dots)"
      >
        cookiebannerbench
      </text>
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="/" className="footer-lockup">
            {/* biome-ignore lint/performance/noImgElement: images are unoptimized in this static export and next/image lazy-loads by default. */}
            <img
              className="logo logo-light"
              src="/brand/wordmark.png"
              alt=""
              width={239}
              height={36}
            />
            {/* biome-ignore lint/performance/noImgElement: see above. */}
            <img
              className="logo logo-dark"
              src="/brand/wordmark-dark.png"
              alt=""
              width={239}
              height={36}
            />
            <span className="sr-only">{SITE_NAME} home</span>
          </a>
          <p className="t-body">
            An open-source benchmark for comparing how cookie banners affect page performance.
          </p>
          <p className="t-body">MIT licensed. Published by CookieYes.</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={`Footer ${c.title}`}>
            <p className="t-label">{c.title}</p>
            <ul className="t-body">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <FooterWordmark />
    </footer>
  );
}
