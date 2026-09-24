# Cookiebannerbench — public site

Statically generated site that publishes the results the benchmark harness produces.
It renders existing runs; it does not measure anything.

## Design system

The site implements the Cookiebannerbench design system (tokens v4): Archivo for
language and every measured value, DM Mono for identifiers; an `ink-*` ramp for
text and fills and a `paper-*` ramp for surfaces; exactly three things carry a
hue — a provider's mark, the score band, and a notice about our own reporting.
Tokens live at the top of `app/globals.css`; there is no CSS framework.

Two deliberate departures from the sheet, both forced by its own accessibility
rule: `text-tertiary` is ink-600 in light (the sheet's ink-500 reads 3.49:1,
short of AA for 11px text — icons keep ink-500 as `--icon-rest`), and pill text
is ink-700 for the same reason.

## Which run is published

The newest directory under `results/`, unless `PUBLISHED_RUN=<run id>` is set
at build time, in which case that run is the leaderboard and the newer ones
appear only in the run history. Use it while a fresh run is being checked, or
when a quick smoke run (few iterations) has landed in `results/` and should
not become the homepage. A run that is missing a target simply has no row for
it; a banner detected in fewer loads than the run made keeps its row with the
count stated; a condition with no banner at all is not scored.

## Consent banner and analytics

The live site loads the CookieYes banner, Google Analytics 4 and Microsoft
Clarity (`app/layout.tsx`). They are only rendered when the build sets
`ENABLE_ANALYTICS=true`, so local builds, CI audits and forks leave them out.

## The score

`lib/scoring.ts` is the single source. Method 2: four categories over eight
measurements, each measurement 100 at zero cost falling linearly to 0 at a
published anchor, each category the share-weighted mean of its measurements,
and the categories combined by fixed weights:

| Category | Weight | Measurements (share · 0 at) |
|---|---|---|
| Banner Speed | 30% | time to banner (100% · 5 s) |
| Page Impact | 25% | first-paint delay (50% · 3 s), blocking added (50% · 600 ms) |
| Network Cost | 25% | bytes added (60% · 250 KB), requests added (40% · 20) |
| Visitor Experience | 20% | viewport coverage (60% · 50 %), wait until clickable (40% · 1 s) |

Bands at 80 and 60. First paint, blocking, bytes and requests are the increase
over the no-SDK control on the same condition; bytes and requests are read off
the wire over the DevTools protocol. A measurement that could not be taken
leaves the score provisional over what was measured; nothing missing is counted
as zero or as a hundred. Each run is scored under the method in force when it
started (`methodForRun`), so method 1 runs keep their method 1 scores. Changing
an anchor, a share or a weight is a method change and goes in the changelog on
`/methodology`.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3100
pnpm build          # static export to out/
node serve.mjs      # serve out/ with gzip + cache headers, like a CDN would
```

`serve.mjs` exists because `python -m http.server` sends no compression and no
cache headers. Auditing against it understates performance by ~10 Lighthouse
points and fails the caching audits — no real host behaves that way.

## How results are ingested

Everything enters through **`data/source.ts`**, the single adapter boundary.
Swapping these files for an API later touches that one module.

| Source | Read from | Used for |
|---|---|---|
| `../results/<runId>/run.json` | most recent run directory | all metrics, ranking |
| `../apps/*/cookiebannerbench.json` | per-app config | vendor grouping, tags |
| `../targets.json` | deployed URL, version, date | provenance |

Each file is parsed with a **zod schema** (`lib/schema.ts`) mirroring
`packages/harness/src/types.ts`. Schema drift fails the build loudly rather than
rendering `undefined` into a published comparison.

All reads happen at build time. Every route is prerendered; nothing fetches at
request time.

## Adding a vendor

The site derives its vendor list from the harness — there is no list to edit.

1. Add the benchmark app in `../apps/<name>/` with a `cookiebannerbench.json`
   carrying a `vendor` field.
2. Deploy it and add its entry to `../targets.json`.
3. Run the harness so the vendor appears in a `run.json`.
4. Rebuild. `generateStaticParams` picks up the new vendor and generates
   `/cmp/<vendor>`, its OG image and its sitemap entry.

Only the display name needs adding, in the `DISPLAY` map in
`app/cmp/[vendor]/page.tsx`.

## Checks

```bash
pnpm typecheck                 # tsc --noEmit, strict
pnpm test                      # ranking unit tests
pnpm build                     # fails on schema drift
```

Accessibility and Lighthouse run against a built export (CI runs both):

```bash
pnpm build && pnpm serve &
pnpm audit:a11y   # every sitemap route × {1280, 390}px × {light, dark}: axe-core
                  # (WCAG 2.2 AA), overflow, JSON-LD, canonicals; keyboard sort /
                  # filter / condition / theme interactions; no-JS render. Fails on any.
pnpm audit:perf   # Lighthouse, mobile emulation, median of 3 per route, asserted
                  # against ../lighthouserc.json (100 in all four categories).
```

### How the export stays small

The document ships only the default leaderboard condition (`LEADERBOARD_SLICE`:
fast desktop / cold / p75) as complete HTML. The other profile × percentile
conditions (every run is cold-cache only, so there is no cache control) are
rendered by `app/slices/[run]/[slice]/route.ts` into standalone fragments,
exported as `/slices/<run>/<profile>_<cache>_<percentile>.html`, and
`public/enhance.js` fetches one the first time it is selected at its clean URL,
`/slices/<run>/<profile>_<cache>_<percentile>/` (Vercel answers the `.html`
path with a 404; `serve.mjs` resolves both) — one request,
one `replaceWith`, no client-side templating. The homepage is ~20 KB gzipped,
readers without JavaScript get the full default table, and first-load JS is
under 3 KB gzipped. `scripts/finalize-export.mjs` strips the unused App Router
hydration runtime from the export; all interactivity is progressive
enhancement, and under `next dev` (where React still hydrates) it waits for
hydration before touching the DOM.

## Integrity rules encoded in the code

- A configuration with no value for the ranked metric is **excluded and labelled
  with the reason**, never given a `0` — which on a lower-is-better metric would
  sort it first. Enforced by `lib/ranking.ts` and covered by unit tests.
- Every rendered number passes through `formatMetric`, so a unit can never be
  dropped.
- Run id, date, condition and sample size appear next to every comparison.
- CookieYes ownership is disclosed on the homepage and in the footer, not only
  on `/about`.
- No INP figure is published: no consent is accepted or rejected in a run.
