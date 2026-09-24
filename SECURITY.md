# Security Policy

The CookieYes team takes security seriously across all our open-source
repositories. We appreciate the efforts of security researchers and the
community in responsibly disclosing vulnerabilities.

## Scope

This repository holds a measurement harness, a set of test applications, the
recorded runs and the static site published at
[cookiebannerbench.com](https://www.cookiebannerbench.com). It ships no product code
to end users and publishes no npm package.

In scope:

- The harness and its collector (`packages/harness/`), including anything it
  executes in a page under test.
- The published site (`site/`) and its build.
- The GitHub Actions workflows and anything that runs with repository
  credentials.

Out of scope:

- Vulnerabilities in the consent SDKs this benchmark measures. Report those to
  the vendor concerned. For `@cookieyes/*` packages, use
  [cookieyes/cookieyes](https://github.com/cookieyes/cookieyes/security/advisories/new).
- The test applications under `apps/` as deployed targets: they are deliberately
  minimal, carry no data and exist only to be measured.
- Disagreement with a published number. That is not a security issue — open an
  issue using the "Dispute a published measurement" template.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately using one of these channels:

- **Preferred:** Use GitHub's [private vulnerability reporting](https://github.com/cookieyes/cookiebannerbench/security/advisories/new)
  for this repository (found under the **Security** tab).
- **Alternative:** Email **security@cookieyes.com** with details of the
  vulnerability.

When reporting, please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof-of-concept if possible.
- The affected path or workflow.
- Any suggested mitigation, if you have one.

## What to expect

- **Acknowledgment:** We will confirm receipt of your report within **3 business
  days**.
- **Assessment:** We will investigate and aim to provide an initial assessment
  within **10 business days**.
- **Resolution:** Once confirmed, we will work on a fix and coordinate a
  disclosure timeline with you. We ask for **90 days** before any public
  disclosure, to give us time to release a fix, unless we agree on a different
  timeline together.
- **Credit:** With your permission, we will credit you in the resulting security
  advisory once the issue is resolved.

## Safe harbor

We consider security research conducted in good faith, consistent with this
policy, to be authorized. We will not pursue legal action against researchers
who follow this process.

Thank you for helping keep the ecosystem and its users safe.
