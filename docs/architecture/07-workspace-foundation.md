# Workspace Foundation (Phase 1)

What the scaffold is, and — more usefully — why it is not the scaffold the
tooling would have generated. Every deviation below was measured, not assumed.

Evidence: `docs/research/prototypes/spike-b-nx-angular-build/`.

## Versions

|            |                                                                |
| ---------- | -------------------------------------------------------------- |
| Node       | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` (Angular 22's own floor) |
| pnpm       | 11.24.0, pinned via `packageManager`                           |
| Nx         | 23.1.1                                                         |
| Angular    | 22.1.4 (framework) / 22.1.6 (CLI, devkit, `@angular/build`)    |
| ng-packagr | 22.1.1                                                         |
| TypeScript | 6.0.3                                                          |
| ESLint     | 10.9.1 with typescript-eslint 8 and angular-eslint 22.1.0      |

## Four deviations from the default Nx setup

**1. The legacy TypeScript setup, not Nx 23's default.**
A default Nx 23 workspace uses TS project references (`composite`,
`customConditions`, npm `workspaces`). `@nx/angular` generators **refuse** it,
citing angular/angular#37276. `NX_IGNORE_UNSUPPORTED_TS_SETUP` exists and Nx
labels it "at your own risk" — not a foundation. So `tsconfig.base.json` uses
`paths`, and TS project references are foreclosed as a build-speed lever.

**2. No `--preset=angular-monorepo`.** It resolves to a fixed GitHub template
and ignores `--appName`, `--ssr` and `--routing`; it produces a shop/api
e-commerce demo with SSR, Express, Playwright and Docker. The workspace is built
from an empty base instead.

**3. Angular pinned explicitly.** `@nx/angular` 23.1.1 pins `~22.0.4`. The P0
and P1 gates were measured against **22.1.4**, so accepting the generator's
range would move the project off the version its evidence covers.

**4. No `baseUrl`.** TypeScript 6.0 deprecates it and 7.0 removes it. `paths`
resolve relative to `tsconfig.base.json` instead. Inheriting a scheduled removal
on day one is a strange way to start a decade-long project.

## `@angular-devkit/build-angular` is refused, and the refusal is checked

Spike B proved no TEKAD build path touches Angular's deprecated webpack builder:
with the package physically removed from `node_modules`, both the ng-packagr
library build and the `@angular/build:application` app build still succeeded.

It nevertheless arrives on its own, as an **optional peer** of `@nx/angular` and
of some test runners. `tools/verify-no-webpack-builder.mjs` asserts its absence
from manifests, lockfile and disk on every CI run.

## Every guard is self-tested

This is the part worth keeping. Each gate below has a `*.test.mjs` beside it
that proves it fails when it should, because **three of the five were wrong or
vacuous on their first implementation and only a self-test revealed it**:

- the webpack-builder check used a substring match and went red on a clean
  lockfile, because `@nx/angular` _declares_ the banned package as an optional
  peer;
- the licence audit flagged `argparse`, whose Python-2.0 text mentions the GPL
  in a historical paragraph two hundred lines in;
- the charting ban in `@nx/enforce-module-boundaries` **never fires at all** for
  an uninstalled package — see below.

A gate that cannot fail is not a gate. `pnpm run verify:gates` runs all the
self-tests, and CI runs them before the gates themselves.

## The dependency-boundary hole, and the layer that closes it

ADR-012 describes four enforcement layers. Testing them found that one does less
than it appears to.

`@nx/enforce-module-boundaries` takes its external-import branch only when
`targetProject.type === 'npm'`, and an npm node exists in the Nx graph only for
packages that are **actually installed**. So `import { Chart } from 'chart.js'`
in a repo without `chart.js` produces no violation whatsoever. The eslint rule
is the _second_ line of defence: it engages after someone has already added the
dependency.

`tools/verify-dependency-policy.mjs` is the first. It fails on the
**declaration** — the moment the decision is actually made — and it is
tag-aware, because ADR-008 does not forbid charting libraries outright, it
forbids them outside a package tagged `type:charts`.

## Layer graph

Dependencies flow downward only. Tags are set in each project's `project.json`.

```
layer:app          →  anything
layer:integration  →  integration, component, foundation
layer:component    →  component, foundation
layer:foundation   →  foundation only
```

`layer:foundation` depending on nothing above it is what makes "installing one
component must not pull the ecosystem" (ADR-004) enforceable rather than
aspirational. `tools/boundary-fixtures/` holds three tiny projects that exercise
the graph in both directions; `tools/verify-boundaries.test.mjs` lints them.

## Two scopes, two severities — licences and vulnerabilities

ADR-015 forbids copyleft because "an Angular library is compiled and tree-shaken
into the consumer's bundle". That argument is about **shipped code**. A bundler
or a d.ts rollup plugin runs on a build machine and ships nothing, so the same
licence carries a different risk there. Both audits therefore run twice:

|                         | production scope         | build tooling                                                                                      |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Licence (gate 13)       | fatal, no exception path | fatal unless recorded in `tools/licence-exceptions.json` with a justification                      |
| Vulnerability (gate 12) | fatal, no exception path | fatal unless recorded in `tools/audit-exceptions.json` with a justification **and an expiry date** |

The expiry matters: an unpatched advisory in build tooling is a decision to
revisit, not a fact to file away. An expired entry fails the build so somebody
has to look again.

The licence gate reads the **LICENSE file**, not the npm `license` field, per
ADR-015's audit rule — PrimeNG's field went opaque at v18, four majors before
the substantive change at v22. Detecting a disguised grant is a heuristic, and
it is tuned for precision: a false positive trains people to ignore the gate,
which is worse than the miss it prevents.

Current state, verified 2026-08-28: the production tree is 9 packages, all
MIT / Apache-2.0 / 0BSD, with no advisories. Three build-tooling licence
exceptions and one vulnerability exception are recorded, each with reasoning.

## Commands

```bash
pnpm install                  # strict peers, isolated node_modules
pnpm verify                   # format, gates, gate self-tests, lint, typecheck
pnpm verify:gates             # prove the guards still fail when they should
pnpm verify:licences          # two-scope licence audit
pnpm verify:audit             # two-scope vulnerability audit
pnpm graph                    # the project graph
```

## Deliberately absent

- **`LICENSE`.** ADR-015 blocks committing it until ADR-016's namespace and
  trademark gates pass. Publishing anything is blocked by the same gate.
- **Nx remote caching.** ADR-012: the self-hosted caches were withdrawn over
  CVE-2025-36852 (CREEP), whose threat model is an open-source repo taking fork
  PRs. `nx.json` sets `neverConnectToCloud`.
- **Any package.** Phase 2 builds the packaging model with two trivial packages
  before real components exist.
