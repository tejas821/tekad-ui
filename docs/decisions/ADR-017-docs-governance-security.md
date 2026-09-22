# ADR-017 — Documentation, governance & security baseline

**Status:** Accepted · **Date:** 2026-08-27
**Evidence:** `docs/research/17-documentation-dx-strategy.md`,
`docs/research/18-community-governance-strategy.md`

## Docs

**Analog** (SSG) as the docs application — the choice of both comparable
solo-maintained Angular libraries, and no off-the-shelf SSG renders live
Angular demos. **Examples live in a compiled workspace library**, referenced by
path and region marker — never a hand-written code fence for library API — and
each carries a mount + render + `axe` smoke test. `marked` + `shiki` for
Markdown. **Compodoc 2.0.0** for API pages at launch, pinned and verified
against TS 6, to be replaced within ~6 months by an in-repo TypeScript
Compiler API extractor. **Pagefind** for search, not Algolia (whose OSS terms
collide with a premium-tooling funding path). `llms.txt` at launch; a docs MCP
server within the first quarter.

**`ng add` at launch, kept small:** install, add the theme import, wire the
provider, print a two-line next step. **Wire `ng-update` plumbing at launch**
even with no migrations — retrofitting leaves v1→v2 users stranded. Publish a
compatibility matrix on the landing page.

## Governance

**Ship:** README, LICENSE, TRADEMARK.md, CONTRIBUTING (reproduction
requirement + commit convention), CODE_OF_CONDUCT (**Contributor Covenant
3.0**, with a real reporting contact **and one named outside person** for
conflicts involving the maintainer), SECURITY.md, issue templates.
**Do not ship:** GOVERNANCE.md (describes a process that does not exist with
one decider) or CODEOWNERS (routes reviews; pointless with one owner).

**Triage:** mandatory minimal reproduction enforced by closing; Discussions for
questions and Issues for confirmed defects only; `pkg-pr-new` preview packages;
Conventional Commits with automated release notes; a published honest response
expectation. No stale bot.

**No LTS commitment at launch** — it is a promise to backport security fixes to
a branch with no users, for 12 months, alone. Publish a compatibility matrix
plus the intent to track Angular majors. Commit only to semver and a migration
schematic for every breaking change.

## Security baseline

- **npm trusted publishing (OIDC) from GitHub Actions. No `NPM_TOKEN`
  anywhere.** `id-token: write` scoped to the publish job only; package set to
  "require 2FA and disallow tokens"; passkey on the account. npm permanently
  revoked all classic tokens on 2025-12-09 and disabled new TOTP setups.
- **Zero lifecycle scripts** in published packages — verifiable and worth
  advertising.
- Committed `pnpm-lock.yaml`; CI `--frozen-lockfile`.
- **Renovate** for version updates (grouping, dependency dashboard,
  `minimumReleaseAge` cooldown) + **Dependabot security alerts only**.
- **OpenSSF Scorecard as an Action from week one** — as a self-updating
  checklist, not a score to chase; its `Maintained` check punishes holidays.
- **CI cache poisoning is demonstrated, not theoretical:** Actions cache never
  shared between PR-triggered and release-triggered workflows; no secret
  reachable from a PR path; third-party actions pinned to full commit SHAs;
  workflow default `permissions: {}`.
- **SECURITY.md:** private reporting as the only channel (never "email me"),
  an honest SLA, explicit scope. No bounty, no 24-hour promise.
- **SBOM deferred** — consumers generate their own from their lockfile.
