# Contributing

Thanks for taking an interest. This repository is a benchmark, which changes
what "a contribution" usually means: the most valuable ones are corrections to
what we measured or how we measured it.

## Ways to contribute

**Dispute a number.** If a published figure looks wrong, open an issue with the
installation, the run ID and the condition. That is the single most useful thing
you can send us, and there is a template for it. A configuration mistake on our
side is re-run and the new run is published beside the old one; the old one is
not edited.

**Add a consent SDK.** Open an issue first so we can agree the setup before you
build it. A target is published only when its banner was detected in every
iteration and its licensing permits the test domain. See
[What is published](https://www.cookiebannerbench.com/methodology/#tab-published).

**Improve the harness or the site.** Bug fixes and clearer disclosure are always
welcome.

## Ground rules for a benchmark

These are not style preferences; a change that breaks one of them changes what
every published number means.

- **A missing measurement is never a zero.** A zero is a measurement. If the
  collector saw nothing, the value is `null` and the page shows a dash with the
  reason.
- **Recorded runs are evidence.** Files under `results/` are written by the
  harness and are not edited by hand. If a run was wrong, record a new one.
- **Anchors and weights are fixed before a run.** Changing one is a method
  change: it gets a new method version and a changelog entry, and historical
  scores are not recomputed.
- **Every claim on the site must be checkable from this repository.** If a page
  asserts something, the thing it asserts should be derivable from `results/` or
  from code — not typed in and left to drift.
- **All installations are set up the way their own documentation says.** If a
  vendor's docs change, the app changes.

## Development

```bash
pnpm install
pnpm build:harness
pnpm --filter @cookiebannerbench/harness exec playwright install chromium
```

Before opening a pull request:

```bash
pnpm lint        # Biome, must be clean
pnpm typecheck   # tsc over the harness
pnpm test        # harness and site unit tests
pnpm --filter @cookiebannerbench/site build   # tests, export, publication check
```

If you touched anything the site renders:

```bash
pnpm --filter @cookiebannerbench/site serve    # in one shell
pnpm --filter @cookiebannerbench/site audit:a11y
pnpm --filter @cookiebannerbench/site audit:perf
```

Both run in CI and both must pass. The accessibility audit also drives the site
without JavaScript, because every page is expected to work that way.

## Running the benchmark yourself

You can run the harness against your own deployments. Two things to know before
you compare your numbers with ours:

- **Run from an EU region.** Some vendors decide from the visitor's IP whether
  to show a banner at all. Run `cookiebannerbench preflight` first; it fails
  loudly on a target that rendered nothing.
- **Numbers are only comparable within one run on one machine.** A shared CI
  runner is not a measurement environment.

See the [README](README.md) for the full picture.

## Pull requests

- Branch off `main`. `main` is protected: a pull request, a passing `verify`
  check and an approval from a code owner are required.
- Keep a pull request to one subject. A measurement change and a site change are
  two pull requests.
- Explain *why* in the description. The diff already says what.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org).

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
