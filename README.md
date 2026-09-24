# ConsentBench

Performance harness for cookie-consent SDKs. Measures 20 Next.js apps — one per
SDK plus controls, identical except for the consent library — and reports p50/p75/p95 with
bootstrap confidence intervals.

Built for regression-testing the CookieYes packages against the field, and for
answering "did this release get slower" with a number that holds up.

## Layout

```
apps/                 20 benchmark targets
packages/harness/     the measurement CLI (@consentbench/harness)
targets.json          app name -> deployed URL
results/<runId>/      one run.json per run (gitignored)
```

Each app carries a `consentbench.json` naming its banner selectors. That file is
the only per-app knowledge the harness has.

## Quick start

```bash
pnpm install
pnpm build:harness
pnpm --filter @consentbench/harness exec playwright install chromium

# Point targets.json at real deployments first, then:
node packages/harness/dist/index.js run --iterations 100
```

## Commands

| Command | Does |
|---|---|
| `consentbench apps` | List apps and where each is deployed |
| `consentbench run` | Measure every app with a target |
| `consentbench report [run]` | Leaderboard for a run (default: latest) |
| `consentbench compare <base> <head>` | Diff two runs, flagging real regressions |

```bash
consentbench run --apps matched-cookieyes,matched-c15t --iterations 100
consentbench report --profile throttled-mobile --cache cold --percentile p75
consentbench compare 2026-09-01T… 2026-09-11T… --threshold 5
```

## What it measures

Per app: `iterations x 2 profiles x 2 cache states` page loads.

- **Profiles** — `fast-desktop` (unthrottled) and `throttled-mobile`
  (Lighthouse Mobile: 4x CPU, 1638/750 Kbps, 150ms RTT), applied over CDP
  before the first request.
- **Cache states** — `cold` is a fresh `BrowserContext`; `warm` is a second
  page in that same context.
- **Metrics** — FCP, LCP, CLS, TBT, TTI, transfer bytes, and banner timing
  (visible, interactive, its own layout shift, viewport coverage).
- **Reporting** — p50/p75/p95, each with a 95% bootstrap CI (1000 resamples,
  seed 42, so a given dataset always yields the same interval).

Apps are measured **interleaved within each iteration**, not one app at a time.
Over a long sweep the machine drifts; measuring app A to completion before app B
turns that drift into an apparent difference between A and B.

## Reading a comparison

`compare` reports a change only when the two confidence intervals **do not
overlap**. A large delta with overlapping intervals is noise that happens to
look like a result.

This only works with enough data. Below 20 iterations per slice the intervals
are narrow enough that ordinary machine noise clears the bar, and the CLI warns
you. Use 20 for a quick check and 100 for anything you will act on.

Numbers are only comparable when they come from the same machine under the same
conditions. A shared CI runner is not that machine.

## Matched vs. as-documented apps

Two apps per SDK, measuring different things:

- **`cookieyes-*` / `c15t-*`** — each SDK set up the way its own documentation
  tells you to. This is what a real integration costs, and the two are *not*
  like-for-like: c15t's documented setup fetches consent state from a backend
  before deciding to render, CookieYes's runs offline from a cookie.
- **`matched-*`** — both SDKs forced into the same conditions: same storage
  mode, same number of rendered surfaces, no framework-specific extras. This is
  the apples-to-apples comparison.

Neither is the "true" number. The as-documented pair answers "what does adopting
this SDK cost me"; the matched pair answers "which engine is faster".

Specifically, the matched apps drop `<CookieYesStyles />` (server-rendered
critical CSS) and `RecallButton` from the CookieYes side, because c15t has no
equivalent of either — measuring a feature one side cannot have is not a
comparison. `cookieyes-nextjs` keeps both.

## Ablation apps

`cookieyes-nextjs-no-critical-css` is identical to `cookieyes-nextjs` in every
respect — same package, same three components, same config — except that it does
not render `<CookieYesStyles />`. Instead it imports the stylesheet normally, so
Next serves it as a render-blocking `<link>`.

The delta between those two apps is the value of shipping the banner's critical
CSS in the first response, isolated from everything else. Read it on
`throttled-mobile` / `cold`, where a round trip for a stylesheet actually costs
something.

Don't read that delta off `cookieyes-nextjs` vs `matched-cookieyes` — those also
differ by `RecallButton`, so the comparison is confounded.

`baseline` is the control: an empty Next app. Every other number is only
meaningful as a delta against it. `cookieyes-core` renders no banner at all —
it is the headless engine — so "no banner detected" is the expected result
there, and the gap against `cookieyes-react` is what the UI layer costs.

## Package versions

Apps pin exact published versions, so a run's numbers are attributable:

| Package | Version |
|---|---|
| `@cookieyes/nextjs` | 0.6.0 |
| `@cookieyes/react` | 0.8.0 |
| `@cookieyes/core` | 0.6.0 |
| `@c15t/nextjs`, `@c15t/react` | 2.2.1 |
| `@didomi/react` | 1.11.0 |
| `next` | 16.3.4 |

Record the version in `targets.json` when you deploy, so a run can be traced
back to what it measured.

## Where you run it matters

**Run the harness from an EU region.** This is a correctness requirement, not a
preference.

Several vendors decide whether to show a banner from the visitor's IP. Measured
from India, Didomi and Usercentrics load their SDKs completely — every request
returns 200 — and then render nothing, because no consent banner is legally
required there. c15t does the same when its backend says so. The page is not
broken; the vendor is behaving correctly for that jurisdiction.

A leaderboard built from a non-GDPR region therefore scores those vendors on a
banner that never existed, and CookieYes renders one unconditionally
(`regulation: "GDPR"`), so the comparison is not like-for-like. Worse, on
upstream's scorer an absent banner earns *full* UX marks — see `score.ts`.

`eu-west-1` is the reference region. Run `consentbench preflight` from the
runner before trusting any sweep: it fails loudly on a vendor that rendered
nothing, which is the failure this whole class of bug hides behind.

Two related notes:

- Vercel serves these targets from the edge PoP nearest the runner (check
  `x-vercel-id`), so the targets' own region setting does not add latency for an
  EU runner. Static output is edge-cached; the region only governs functions.
- That edge cache is a third cache dimension on top of the browser cold/warm
  split. `preflight` warms every PoP as a side effect of checking it, so run it
  immediately before a sweep.

## Deploying the targets

Each app is an independent Next project. Deploy all 19 to the same provider and
the same region, then fill in `targets.json`. Two settings matter:

- **Deployment protection off** — otherwise the harness measures a login page.
- **Analytics / Speed Insights off** — they inject a script and skew the exact
  metrics being measured.

Targets must be `https`. `http://localhost` is accepted so the harness can be
smoke-tested against `next start`, but localhost numbers are not comparable
with deployed ones.

## Development

```bash
pnpm test        # harness unit tests
pnpm lint        # Biome check
pnpm lint:fix    # Biome autofix
pnpm typecheck   # tsc over the harness
```
