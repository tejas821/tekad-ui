# ADR-012 — Monorepo tooling & package manager

**Status:** Accepted (with standing conditions) · **Date:** 2026-08-27
**Evidence:** `docs/research/04-package-and-entrypoint-strategy.md`

## Decision
**Nx 23.1 + pnpm 11**, with Nx Release for mechanics and Changesets as the
contributor ritual.

**pnpm is non-negotiable.** Its non-flat `node_modules` means only direct
dependencies resolve, turning phantom dependencies — the primary way a library
monorepo ships something that works in-repo and breaks for consumers — into an
**install-time error**, one layer below lint where it cannot be disabled.
npm hoists; Yarn Classic is frozen at 1.22.22 (2024); Yarn Berry PnP is
unverified against Angular 22 tooling; Bun hoists by default.

## Alternatives
Angular CLI + pnpm + Changesets scored identically (55 vs 55) but fails
differently: at 15–30 packages it means hand-building a task graph, affected
detection and release orchestration — reinventing a worse Nx. Turborepo (52)
has free caching but coarser graph precision and hand-written orchestration.
Bazel is not credible — `rules_angular` has one BCR release (0.1.0, 2025-06).
Lerna is maintained by the Nx team and depends on Nx; not an independent choice.

Published output is byte-identical across all options — ng-packagr rewrites the
`package.json` — so lock-in is repo-side and mechanically reversible.

## Standing conditions
1. **Accept a 4–8 week lag on every Angular major.** `@nx/angular@22.7.8` hard-
   caps at Angular `<22.0.0`; v22 support landed only in Nx 23.1 (2026-07-15).
   If TEKAD ever positions on day-one support for each Angular release, that
   promise is incompatible with Nx — switch to Angular CLI + pnpm + Changesets.
2. **Do not depend on Nx remote caching.** `@nx/s3-cache`, `@nx/gcs-cache`,
   `@nx/azure-cache` and `@nx/shared-fs-cache` are deprecated and commercially
   licensed, withdrawn over **CVE-2025-36852 (CREEP)** — a PR modifies the CI
   workflow, and because the workflow is not in the cache key the cache is
   poisoned for later legitimate builds. An OSS repo taking fork PRs *is* that
   threat model. Local cache + `nx affected` only; remote-cache writes from
   `main` alone.

## Boundary enforcement — four layers, not one
pnpm strict resolution (cannot be disabled) → `@nx/enforce-module-boundaries`
(an ESLint rule, so gate as error and review every `allow`) → ng-packagr's
`allowedNonPeerDependencies` throw → the packed-tarball import probe.

## 2026-08-28 — Spike B closes the open item, and adds three constraints

**The open item is closed: `@nx/angular@23.1.1` does NOT route through
`@angular-devkit/build-angular` on Angular 22.**

Measured, not read. `@nx/angular:application` asserts `@angular/build` is
installed and delegates to its `buildApplication`; the generated app targets are
`@angular/build:application` / `:dev-server` / `:extract-i18n`;
`@nx/angular:package` calls `ngPackagr()` from ng-packagr directly, and its only
`@angular-devkit/build-angular` reference is a **type-only** import in a `.d.ts`.

Decisive test: `@angular-devkit/build-angular` was physically removed from
`node_modules`, and **both the library build and the application build still
succeeded**. OBSERVED.

Nx still ships opt-in webpack paths (`browser-esbuild`, the `webpack-*`
builders, `--bundler=webpack`). TEKAD does not take them.

**Hygiene, not correctness:** the Nx Angular template *declares*
`@angular-devkit/build-angular` in `dependencies` and npm prints its deprecation
warning; it also arrives as an optional peer of `@nx/angular` and of
`@analogjs/vite-plugin-angular`. Phase 1 must not declare it, and CI should
assert it is absent from the lockfile so a test-runner choice cannot reintroduce
it. **This was measured under npm; re-measure under pnpm, which this ADR
mandates.**

### Three new constraints on Phase 1

1. **Nx 23's default TypeScript setup is unusable with Angular.** A default Nx
   23.1.1 workspace uses TS project references (`composite`, `customConditions`,
   npm `workspaces`); `@nx/angular` generators **refuse** it, citing
   angular/angular#37276. `NX_IGNORE_UNSUPPORTED_TS_SETUP` exists and Nx labels
   it "at your own risk" — not acceptable for a foundation. **TEKAD scaffolds on
   the legacy `tsconfig.base.json` + `paths` setup.** TS project references are
   foreclosed as a build-speed lever; revisiting that is an ADR reopen.
2. **`create-nx-workspace --preset=angular-monorepo` is not TEKAD's scaffold.**
   It now resolves to a fixed GitHub template and ignored `--appName`, `--ssr`
   and `--routing`, producing a shop/api e-commerce demo with SSR, Express,
   Playwright and Docker. Phase 1 builds from an empty workspace and adds
   projects with generators.
3. **Pin Angular explicitly after scaffolding.** `@nx/angular` 23.1.1 pins
   `~22.0.4` and installed 22.0.6; the P0/P1 gates were measured against
   **22.1.4**. Accepting the generator's range would move TEKAD off the version
   its evidence covers.

### A fifth boundary-enforcement layer

The four layers above all police *inter*-package boundaries. Spike B found an
*intra*-package one: a **relative import that crosses an entry-point boundary**
fails the ng-packagr build with an internal crash —
`Cannot destructure property 'pos' of 'file.referencedFiles[index]'` — not a
readable diagnostic. Add a lint rule that forbids relative imports crossing an
entry-point boundary, so contributors get the readable error first.

Evidence: `docs/research/prototypes/spike-b-nx-angular-build/`.
