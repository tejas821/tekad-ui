# Spike B — does `@nx/angular` still route through the deprecated webpack builder?

**Resolves the open item on ADR-012.** Additionally converts two ADR-004
assumptions into measurements. Run 2026-08-28.
Artifacts: `run-spike-b.sh`, `spike-b-results.json`.

## The question

ADR-012 accepted **Nx 23.1 + pnpm** with one condition left open:

> **Spike before scaffolding:** does `@nx/angular@23.1.1` avoid the deprecated
> `@angular-devkit/build-angular` path on v22? It is still an optional peer,
> and webpack builders are deprecated in v22.

This matters because TEKAD's build tooling is load-bearing for a decade, and
because Angular 22 emits a deprecation warning for webpack support. If Nx's
executors were a thin wrapper over the deprecated builder, TEKAD would inherit
a sunset dependency at the foundation.

## Method

Source reading was used **only to decide what to test**. Every verdict below
comes from an executed build. The decisive step is crude on purpose: the
`@angular-devkit/build-angular` directory was physically moved out of
`node_modules`, and both a library build and an application build were then
run. A build that needs it cannot silently pass this.

Versions actually exercised: Node 26.8.1 · Nx 23.1.1 · `@nx/angular` 23.1.1 ·
`@angular/core` 22.0.6 · `@angular/build` 22.0.6 · ng-packagr 22.0.2 ·
TypeScript 6.0.3.

**Scope limitation, stated up front:** this ran under **npm**, not the pnpm
that ADR-012 mandates. Executor routing is package-manager-independent, so Q1
transfers. The *installation* observation in Q2 is npm-specific and must be
re-measured under pnpm in Phase 1.

## Q1 — routing · **RESOLVED: `@angular/build`, not the deprecated builder**

| Path | Executor | What it actually calls |
|---|---|---|
| Application build | `@angular/build:application` | `@nx/angular:application` asserts `@angular/build` is installed, then `import('@angular/build')` and delegates to `buildApplication` |
| Dev server | `@angular/build:dev-server` | — |
| i18n extraction | `@angular/build:extract-i18n` | — |
| Publishable library | `@nx/angular:package` | `ngPackagr()` from **ng-packagr directly**, with an Nx stylesheet-processor provider |

The only `@angular-devkit/build-angular` reference on the library path is a
**type-only** import in `schema.d.ts` — it never loads at runtime.

**Decisive test.** With `@angular-devkit/build-angular` removed from disk:

```
LIBRARY build (@nx/angular:package)      → SUCCESS
APP build (@angular/build:application)   → SUCCESS
```

**OBSERVED.** ADR-012's open item is closed: Nx does not route through the
deprecated builder on the paths TEKAD uses.

Nx still *ships* webpack paths — `@nx/angular:browser-esbuild`, the
`webpack-browser` / `webpack-server` / `dev-server` builders, and
`createProjectForWebpack` (reachable via `--bundler=webpack`). They are opt-in
and TEKAD does not take them.

## Q2 — is it still installed anyway? · **Yes, and that is a hygiene issue**

The `angular-monorepo` template declares `@angular-devkit/build-angular@22.0.6`
in `dependencies`, and npm prints its deprecation notice on install. After
removing the direct dependency it remains resolvable, as an **optional peer** of
both `@nx/angular` and `@analogjs/vite-plugin-angular` (the vitest-analog runner
the template chose).

It is declared and installed, but **not on any build path TEKAD uses** — proved
by removing it. Phase 1 should not declare it, and CI should assert it is absent
from the lockfile so it cannot creep back through a test-runner choice.

## Q3 — Nx 23's default TypeScript setup is **incompatible** with Angular

Not a question this spike set out to answer; it surfaced on the first attempt
and is the most consequential finding for Phase 1.

A default Nx 23.1.1 workspace uses the **TS-solution setup**: `composite: true`,
`emitDeclarationOnly`, `customConditions`, a root `tsconfig.json` with
`references: []`, and npm `workspaces`. Against that workspace:

```
NX  The "@nx/angular:library" generator doesn't support the existing TypeScript setup

The Angular framework doesn't support a TypeScript setup with project references.
See https://github.com/angular/angular/issues/37276 for more details.
You can ignore this error, at your own risk, by setting the
"NX_IGNORE_UNSUPPORTED_TS_SETUP" environment variable to "true".
```

The Angular template instead emits the legacy `tsconfig.base.json` + `paths`
setup with no `composite` and no npm workspaces.

**Architectural implication.** TEKAD scaffolds on the **legacy path-mapping
setup**. `NX_IGNORE_UNSUPPORTED_TS_SETUP` is not an option for a foundation —
Nx itself labels it "at your own risk", and the underlying Angular issue is
open. This forecloses TS project references as a build-speed lever; if that
ever becomes necessary, it is an ADR-012 reopen, not a config tweak.

## Q4 — the `angular-monorepo` preset is **not usable as TEKAD's scaffold**

`create-nx-workspace --preset=angular-monorepo` now resolves to a fixed GitHub
template (`nrwl/angular-template`) and **ignored** `--appName`, `--ssr` and
`--routing`. It produced a `shop`/`api` e-commerce demo with SSR, Express,
Playwright, Docker and vitest-analog.

Phase 1 must build from an empty workspace and add projects with generators.

## Q5 — the generator pins **Angular 22.0.x**, not 22.1.x

`backwardCompatibleVersions[22].angularVersion` is `~22.0.4`; the scaffold
installed `@angular/core` 22.0.6. TEKAD's research and the P0/P1 gates target
**22.1.4**. Phase 1 needs an explicit pin step after scaffolding; accepting the
generator's range would silently move the project off the version the gates were
measured against.

## Q6 — two-level entry points work · gates ADR-004

`@nx/angular:library-secondary-entry-point` generates a **flat, one-level**
entry point and scaffolds an **NgModule** — neither matches TEKAD's
standalone-only, two-level, category-prefixed topology. So the topology was
hand-authored instead: `libs/probelib/components/input/` with its own
`ng-package.json`. ng-packagr **auto-discovered it by directory scan** — no
registration anywhere — and emitted:

```json
"exports": {
  "./package.json":     { "default": "./package.json" },
  ".":                  { "types": "./types/…probelib.d.ts",                  "default": "./fesm2022/…probelib.mjs" },
  "./button":           { "types": "./types/…probelib-button.d.ts",           "default": "./fesm2022/…probelib-button.mjs" },
  "./components/input": { "types": "./types/…probelib-components-input.d.ts", "default": "./fesm2022/…probelib-components-input.mjs" }
}
```

with `"sideEffects": false` and **no wildcard subpath**, so `./src/*` is
unimportable by default.

This is exactly the package shape **Spike A** proved tsserver resolves for
auto-import. The two spikes therefore chain: ng-packagr emits the map, and
tsserver offers `import { … } from '@tekad/core/components/button'` from it.
ADR-004's topology is now end-to-end evidenced rather than assumed at either end.

**Consequence for Phase 1:** TEKAD needs its own entry-point generator, or a
documented manual convention. The stock generator is the wrong shape.

## Q7 — cross-entry-point imports

**Relative import across a boundary → build fails**, which is correct, but the
diagnostic is an internal crash:

```
Cannot destructure property 'pos' of 'file.referencedFiles[index]' as it is undefined.
```

Not "…is not part of any entry point". A contributor who does the natural thing
gets an unreadable error. **Add a lint rule that forbids relative imports
crossing an entry-point boundary**, so the readable error arrives before
ng-packagr's does. This is a fifth layer for ADR-012's boundary-enforcement
stack, and the only one that speaks to *intra*-package boundaries.

**Package-name import across a boundary → build succeeds, no duplication.**
The shared symbol appears exactly once, in the primary FESM; each secondary FESM
keeps a bare unresolved `import { sharedHelper } from '@tekad-probe/probelib'`.

This **corrects** the research note that stock ng-packagr lacks Material's
shared-chunk splitting. Accurate statement: ng-packagr emits no shared *chunk
files*, but it does not duplicate either — it defers deduplication to the
consumer's bundler. The outcome that matters (no duplication) holds.

## Q8 — tree-shaking measured · gates ADR-004's open item

A distinctive **ballast** symbol was exported from the primary entry point and
used by nothing. The built package was installed into `node_modules` (the
published artefact, not the source), and an app imported **only**
`@tekad-probe/probelib/components/input`.

| Check | Result |
|---|---|
| Component reached the production bundle | ✔ |
| Shared helper it actually uses reached the bundle | ✔ |
| **Unused primary-entry-point ballast in the bundle** | **✘ — tree-shaken out** |
| **Positive control** (app rebuilt with an explicit ballast import) | **✔ present → probe valid** |

**OBSERVED, with a passing control.** Importing a secondary entry point does not
drag the primary entry point into the bundle.

**This does not discharge ADR-004's CI tree-shaking probe.** One ballast symbol
in one app shows the mechanism works; it does not show it holds for TEKAD's real
package graph, where DI tokens, module-level side effects and `providedIn: 'root'`
services are the things that actually defeat tree-shaking. The requirement stands
— it is now known to be *achievable*, which is a different claim.

## Verdict

**Spike B: GO.** ADR-012 stands unchanged in its decision; its open item is
closed. Three new Phase 1 constraints fall out (legacy TS setup, no preset,
explicit Angular pin) and none of them threatens the tooling choice.

## Outstanding

1. **Re-measure Q2 under pnpm.** A non-flat `node_modules` changes optional-peer
   resolution. ADR-012 mandates pnpm; this spike ran on npm.
2. **ADR-004's CI tree-shaking probe app** is still required (see Q8).
3. **Write TEKAD's own secondary-entry-point generator** (see Q6).
4. **Add the intra-package import-boundary lint rule** (see Q7).

## Reproducing

```bash
bash run-spike-b.sh        # needs network + Node >= 22.22.3
```

Every claim above corresponds to a numbered step in that script. It works in a
scratch directory and touches nothing outside it.
