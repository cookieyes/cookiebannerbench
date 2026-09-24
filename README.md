# Cookiebannerbench

An open benchmark for what consent banners cost the pages they sit on.

Every consent layer in the field is installed into an otherwise identical
Next.js page, deployed, and measured under fixed conditions. The result is a
score out of 100 built from four costs a page actually pays — how long a visitor
waits to be asked, what the banner transfers, how much of the first screen it
covers, and how much it disturbs the page while loading — published alongside
every measurement that produced it.

Published at **[cookiebannerbench.com](https://www.cookiebannerbench.com)**.

> CookieYes publishes this benchmark and appears in it. That is a conflict of
> interest, and it is stated on the site rather than left to be discovered. The
> anchors and weights are fixed before a run, every individual load is
> published, and the whole thing is here so the comparison can be checked
> rather than trusted.

## What is in here

```
apps/                    one Next.js app per installation under test, plus a
                         no-SDK control. Identical except for the consent layer.
packages/harness/        the measurement CLI (@cookiebannerbench/harness)
targets.json             app name -> deployed URL and the version deployed there
results/<runId>/run.json every recorded run, committed
site/                    the published site, built from results/ and nothing else
```

Each app carries a `cookiebannerbench.json` naming its banner selectors. That
file is the only per-app knowledge the harness has.

`results/` is committed on purpose. The site is built from it, so every number
on a page can be traced to the load that produced it, and an old run is kept
beside a new one rather than replaced.

## Quick start

```bash
pnpm install
pnpm build:harness
pnpm --filter @cookiebannerbench/harness exec playwright install chromium

# Point targets.json at real deployments first, then:
pnpm bench run --iterations 20
```

| Command | Does |
|---|---|
| `cookiebannerbench apps` | List apps and where each is deployed |
| `cookiebannerbench preflight` | Check every target renders a banner before a sweep |
| `cookiebannerbench run` | Measure every app that has a target |
| `cookiebannerbench report [run]` | Leaderboard for a run (default: latest) |
| `cookiebannerbench compare <base> <head>` | Diff two runs, flagging real regressions |

## What it measures

Per app: `iterations × profiles` page loads, every load cold.

- **Profiles** — `fast-desktop` (unthrottled) and `throttled-mobile`
  (Lighthouse Mobile: 4× CPU, 1638/750 Kbps, 150 ms RTT), applied over CDP
  before the first request.
- **Cold loads** — each load starts in a fresh `BrowserContext` with an empty
  cache, so nothing carries over from the load before it.
- **Metrics** — FCP, LCP, CLS, TBT, TTI, transferred bytes, request count,
  third-party bytes, script load time, and banner timing: when it became
  visible, when its first control was present, its own layout shift, and the
  share of the first viewport it covered.
- **Reporting** — p50/p75/p95, each with a 95% bootstrap interval (1000
  resamples, seed 42, so a given dataset always yields the same interval).

Apps are measured **interleaved within each iteration**, not one app at a time.
Over a long sweep the machine drifts; measuring app A to completion before app B
turns that drift into an apparent difference between A and B.

## How the score is built

Four categories, fixed weights, each mapped to 0–100 by a published linear
anchor:

| Category | Weight |
|---|---|
| How long until the banner is visible | 30% |
| What the consent layer transferred, beyond the control | 25% |
| Share of the first viewport the banner covered | 25% |
| Layout shift and main-thread blocking, beyond the control | 20% |

`sub = 100 × (1 − min(cost, ceiling) / ceiling)`, combined by weight over the
categories that were measured. Bands are Good ≥ 80, Fair 60–79, Poor below 60.

Nothing missing is counted as zero. Where an input could not be measured the
weight is renormalised over the rest and the row is marked provisional. Where no
banner was detected there is no score at all — a dash, never a number built from
the inputs that remain.

The anchors, the weights and the exact arithmetic live in
[`site/lib/scoring.ts`](site/lib/scoring.ts) and are restated on
[the method pages](https://www.cookiebannerbench.com/methodology/).

## Reading a comparison

`compare` reports a change only when the two confidence intervals **do not
overlap**. A large delta with overlapping intervals is noise that happens to
look like a result.

This only works with enough data. Below 20 iterations per slice the intervals
are wide enough that ordinary machine noise clears the bar, and the CLI warns
you. Use 20 for a quick check and 100 for anything you will act on.

Numbers are only comparable when they come from the same machine under the same
conditions. A shared CI runner is not that machine.

## Where you run it matters

**Run the harness from an EU region.** This is a correctness requirement, not a
preference.

Several vendors decide whether to show a banner from the visitor's IP. Measured
from outside the EU, some load their SDK completely — every request returns
200 — and then render nothing, because no consent banner is legally required
there. The page is not broken; the vendor is behaving correctly for that
jurisdiction. A leaderboard built from such a region scores those vendors on a
banner that never existed, and scores others on one they render
unconditionally, so the comparison is not like-for-like.

`eu-west-1` is the reference region. Run `cookiebannerbench preflight` from the
runner before trusting any sweep: it fails loudly on a target that rendered
nothing, which is the failure this whole class of bug hides behind.

Two related notes:

- Vercel serves these targets from the edge PoP nearest the runner (check
  `x-vercel-id`), so a target's own region setting does not add latency for an
  EU runner. Static output is edge-cached; the region only governs functions.
- That edge cache is a cache dimension on top of the browser's. `preflight`
  warms every PoP as a side effect of checking it, so run it immediately before
  a sweep.

## Deploying the targets

Each app is an independent Next project. Deploy every app you intend to measure
to the same provider and the same region, then record its URL and the exact
version it ships in `targets.json` — that file is what makes a run
attributable. Two settings matter:

- **Deployment protection off** — otherwise the harness measures a login page.
- **Analytics / Speed Insights off** — they inject a script and skew the exact
  metrics being measured.

Targets must be `https`. `http://localhost` is accepted so the harness can be
smoke-tested against `next start`, but localhost numbers are not comparable
with deployed ones.

## The site

`site/` is a static export with no client framework: server-rendered HTML plus
about 5 KB of JavaScript for sorting, search and the condition switcher. It
reads `results/` at build time and nothing else.

```bash
pnpm --filter @cookiebannerbench/site dev     # localhost:3100
pnpm --filter @cookiebannerbench/site build   # test, export, verify
pnpm --filter @cookiebannerbench/site audit:a11y
pnpm --filter @cookiebannerbench/site audit:perf
```

CI runs both audits on every push and fails if any audited route scores below
100 in any Lighthouse category or trips a single accessibility rule.

## Development

```bash
pnpm test        # harness and site unit tests
pnpm lint        # Biome check
pnpm lint:fix    # Biome autofix
pnpm typecheck   # tsc over the harness
```

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security
reports go through [SECURITY.md](SECURITY.md), never a public issue.

## Licence

MIT. See [LICENSE](LICENSE).
