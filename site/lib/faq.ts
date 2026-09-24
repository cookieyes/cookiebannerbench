export const FAQ = [
  {
    q: "Who publishes Cookiebannerbench?",
    a: "CookieYes publishes it and three of its own installations appear in the results — two npm packages and its CDN script. That is a conflict of interest, and it is stated here and in the footer of every page rather than left to be discovered. Anchors, weights, run conditions, every measurement and every individual load are published so the comparison can be checked rather than trusted.",
  },
  {
    q: "Which installations are published?",
    a: "Installable consent-banner products whose banner renders on the test domain and whose licensing permits it. A load in which the banner was not detected is counted and shown on the row. Internal experiments are not published. The no-SDK baseline is shown as an unscored control. A provider that is absent is a fact about the benchmark, not about the provider.",
  },
  {
    q: "Why is the table sorted by score?",
    a: "The score is the one composite the method defines, with its anchors and weights published. Every other column sorts on request and none is pre-sorted, because pre-sorting a metric would be an editorial claim about which cost matters most.",
  },
  {
    q: "What does the score mean?",
    a: "0–100 over four categories of cost, eight measurements in all: Banner Speed (30%) — time to banner; Page Impact (25%) — how much later the page first paints, and how much more the main thread is blocked, than the same page with no consent SDK; Network Cost (25%) — bytes and requests added; Visitor Experience (20%) — how much of the screen the banner covers, and how long after appearing it can be clicked. Each measurement is 100 at zero cost and 0 at a published anchor. Good is 80 and above, Fair 60–79, Poor below 60. It does not measure compliance, features or product quality.",
  },
  {
    q: "Why are some scores provisional?",
    a: "Because a measurement could not be taken on that condition — for example, no control on the banner became clickable in time. The score is computed over what was measured, the arc for the missing category is left empty, and the row says so. Nothing missing was counted as zero. Bytes are read off the wire, so a host that hides its sizes does not make a row provisional.",
  },
  {
    q: "Why is LCP not in the score?",
    a: "LCP is a property of the whole page, most of which the consent layer did not build. It is reported on every row and card — a fast banner cannot hide a slower page — but it is not weighted, because weighting it would score the test app's framework as much as the consent layer.",
  },
  {
    q: "Does a dash mean zero?",
    a: "No. A dash means the run produced no measurement for that cell, and the reason is on the detail page. A zero is a measurement and would claim something the benchmark did not observe.",
  },
  {
    q: "How often are results updated?",
    a: "Runs are recorded on demand and each result names its run and date. The history keeps older runs beside newer ones instead of replacing them. When the method changes, historical scores are not recomputed.",
  },
  {
    q: "Where is the source?",
    a: "The harness, every test app and every run manifest are in the public repository linked from the top bar. Each detail page also offers the raw trace for that installation as JSON.",
  },
];
