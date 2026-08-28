# Governance, Security & Supply-Chain Strategy

Research date 2026-08-26/27. Scoped to a founder-led, solo-maintained project.

## Launch governance file list

**Ship:** `README.md`, `LICENSE` (Apache-2.0), `TRADEMARK.md`,
`CONTRIBUTING.md` (short — reproduction requirement + commit convention),
`CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates. PR template optional.

**Do not ship at launch:** `GOVERNANCE.md` — it describes a decision process
that does not exist when there is one decider, and creates an expectation you
will then violate. Write it the day a second person gains merge rights.
`CODEOWNERS` — it exists to route reviews; pointless with one owner.

**Contributor Covenant 3.0** (released 2025-07-28, stewarded by the
Organization for Ethical Source) — not 2.1. Adoption is real and ongoing
(Hanami 2025-09, Django 2026-04). 3.0 *requires* a real reporting address and
enforcement process; a solo maintainer names themselves and **also names one
trusted outside person for conflicts involving the maintainer**. A CoC with an
unfilled `[INSERT CONTACT METHOD]` placeholder is worse than none.

## Triage that actually scales to one person

Ranked by leverage:

1. **Mandatory minimal reproduction, enforced by closing.** Both Google and
   Taiga do this. Single biggest time saver.
2. **Discussions for questions, Issues for confirmed defects only** — keeps the
   issue count a work queue rather than a support inbox.
3. **`pkg-pr-new`** — publishes an installable preview package per PR without
   touching the registry, so a reporter can verify a fix before you cut a
   release. Collapses fix→confirm from days to minutes.
4. **Conventional Commits + automated release notes** — removes changelog work.
5. **A published, honest response expectation** ("best effort, typically
   within 14 days; I am one person") — more honest than a stale bot. Stale
   bots are contested precisely because they auto-close valid bugs and punish
   reporters for maintainer inaction.
6. **`good first issue` only when the fix approach is written in the issue
   body** — otherwise it generates PRs costlier to review than to write.

## Version support — do not commit to LTS at launch

Angular commits to a major every 12 months and **24 months support per major
(12 Active + 12 LTS)**. Taiga maintains a long-term v4 branch plus automated
`ng update` migrations and a `@taiga-ui/legacy` transitional package with an
explicit removal promise one major later.

**ng-primitives — the closest peer — publishes no LTS at all**, states plainly
that pre-1.0 APIs may change, and expresses support purely as a compatibility
table.

**An LTS commitment is a promise to backport security fixes to a branch with
no users, for 12 months, alone.** Launch posture: a published compatibility
matrix plus a stated intent — "we track Angular majors; each TEKAD major
supports the Angular major it ships against and the one after." Revisit at 1.0
with real adoption data. Commit now only to Conventional-Commits-driven semver
and a migration schematic for every breaking change.

## Not relicensing — the mechanism is structural, not a promise

The recognised mechanisms are **distributed copyright ownership** (Linux
kernel — no single entity owns all copyrights, so unanimous consent is
impracticable), **foundation governance**, and **nonprofit legal constraint**.

The Linux Foundation asserts no project inside a community-focused foundation
has ever relicensed to source-available, while every relicensing incident
involved single-vendor copyright control: MongoDB → SSPL (2018), Elastic →
SSPL/Elastic License (2021), HashiCorp → BUSL (2023) — and now PrimeNG → PrimeUI
(2026).

For TEKAD: **DCO with contributors retaining copyright is itself the
commitment**, because it removes the legal capacity to relicense contributed
code unilaterally. That is a costly, credible signal in a way a promise
document is not. See `14-license-analysis.md`.

## Security baseline

### Publishing — the 2026 flow is unambiguous

- **npm trusted publishing (OIDC) has been GA since 2025-07-31.** Supported:
  GitHub Actions (GitHub-hosted runners only), GitLab CI, CircleCI cloud.
  Requires npm CLI ≥ 11.5.1 and Node ≥ 22.14.0. **Provenance attestations are
  generated automatically** for GitHub Actions, public packages from public
  repos.
- **On 2025-12-09 npm permanently revoked ALL classic tokens** — they can no
  longer authenticate, be recreated, or be recovered. `npm login` now issues
  2-hour session tokens; granular write tokens cap at 90 days; new TOTP setups
  are permanently disabled (WebAuthn/passkeys required).

⇒ **GitHub Actions + OIDC trusted publishing. No `NPM_TOKEN` anywhere.**
`id-token: write` scoped to the publish job only. Set the package to "require
2FA and disallow tokens." Passkey on the npm account. Any design storing a
long-lived npm token in repo secrets is obsolete and actively worse.

Provenance proves *which repo, which workflow, which commit* built the
tarball. It does not prove the code is good.

### Repository hardening

GitHub's own guidance — under half an hour: SECURITY.md, **private
vulnerability reporting enabled**, secret scanning with push protection,
Dependabot + dependency review, CodeQL default setup, branch protection.

Run **OpenSSF Scorecard as an Action from week one** — its value is a
self-updating checklist, and its Critical checks (`Dangerous-Workflow`,
`Webhooks`) catch exactly the CI misconfigurations recent attacks exploited.
Do **not** treat the numeric score as a goal: the `Maintained` check (≥1
commit/week) punishes a solo maintainer who takes a holiday. The
Baseline/Best-Practices badge is a marketing artefact — baseline-1 is worth an
afternoon, higher tiers are not.

### Dependency intake

**Run both:** Dependabot for *security alerts* only (free, native, no config),
and **Renovate for version updates** — grouping (one PR for all `@angular/*`),
automerge by update type, a dependency-dashboard issue as a single triage
surface, and decisively **`minimumReleaseAge` cooldown**, so a compromised
upstream release does not enter the build on day zero. pnpm 11 defaults
`minimumReleaseAge` to 24h; pnpm 10+ disables dependency `postinstall`
scripts by default.

### TEKAD-specific exposures

- **Publish zero lifecycle scripts.** No `postinstall`, no `prepare` in the
  published package. A UI library has no legitimate need, and its absence is a
  verifiable claim worth advertising.
- **Lockfile integrity** — commit `pnpm-lock.yaml`; CI uses
  `--frozen-lockfile`. It is what makes provenance meaningful.
- **Scope squatting** — entry points are *paths*, so they cannot be confused,
  but **the scope itself and plausible unscoped names can be squatted**.
  Register the npm org/scope **before announcing the name anywhere public**,
  and publish placeholders for `tekad`, `tekad-ui`, `ngx-tekad`. Every future
  package name must be reserved before it appears in a public commit.
- **CI cache poisoning is a demonstrated attack path, not theoretical.**
  GitHub Actions cache must not be shared between PR-triggered and
  release-triggered workflows; no secret reachable from a PR-triggered path;
  all third-party actions pinned to **full commit SHAs**, not tags; workflow
  default `permissions: {}`.
- **Compromised maintainer tokens** — solved structurally by trusted
  publishing: there is no token to steal.

Recent vectors worth internalising: the September 2025 debug/chalk/color
compromise (~18 packages) began as a **maintainer account phishing hijack**
and injected a browser-side crypto-clipper.

### SBOM — defer

Consumers generate their own SBOMs from their lockfile, which includes TEKAD.
Publishing one is an enterprise compliance signal, not a security control. If
ever needed, CycloneDX (`@cyclonedx/cyclonedx-npm` runs off the lockfile in one
CI step); GitHub's dependency graph exports SPDX for free.

### SECURITY.md contents

Supported versions (one line); the **private-reporting link as the only
channel** — never "email me", which is unverifiable and unaccountable; an
honest SLA ("acknowledgement within 5 business days; single maintainer"); and
scope — in: XSS in component templates, sanitiser bypass, prototype pollution
in utilities; out: vulnerabilities in the consumer's app, self-XSS, missing
headers on the docs site. Do not promise 24-hour response. Do not run a bounty.

Angular's own SECURITY.md is four lines. Brevity is normal.
