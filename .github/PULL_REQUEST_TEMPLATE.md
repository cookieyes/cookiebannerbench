<!-- Thanks for contributing! Please fill out the sections below. -->

## Description

<!-- What does this PR change, and why? -->

## Related issue

<!-- e.g. Closes #123 -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New installation under `apps/` (a provider added to the benchmark)
- [ ] Harness or CLI change
- [ ] Site change
- [ ] Method change (what is measured, how it is scored, or what is published)
- [ ] Documentation update
- [ ] Chore / refactor (no functional change)

## Effect on published numbers

<!--
  Does this change any figure already on the site, or what one means? If it
  does, say which, and confirm the method version and changelog entry are in
  this PR. Historical scores are not recomputed. Write "None" if it doesn't.
-->

## How was this tested?

- [ ] Unit tests added/updated
- [ ] Tested manually (describe steps below)
- [ ] Recorded a run (paste the run ID)

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm --filter @cookiebannerbench/site build` passes
- [ ] If the site changed: `audit:a11y` and `audit:perf` pass locally
- [ ] Nothing under `results/` was edited by hand
- [ ] Any claim I added to a page is checkable from this repository
- [ ] My commits follow the [Conventional Commits](https://www.conventionalcommits.org) format

## Additional context

<!-- Anything else reviewers should know. -->
