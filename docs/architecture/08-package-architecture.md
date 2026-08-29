# Package & Entry-Point Architecture, realised (Phase 2)

ADR-004 as running code. Two trivial packages exist so the packaging model can
be proved before a single real component depends on it — because package
topology is baked into every consumer's import statements and is the most
expensive thing in this repository to change later.

## What exists

```
@tekad/core                          layer:foundation
  .                                  TEKAD_VERSION
  ./primitives/identity              uniqueId()          ← two-level entry point

@tekad/button                        layer:component
  .                                  TekadButton
```

Neither is the eventual TEKAD button or the eventual foundation. They are the
smallest things that still exercise every property Phase 2 has to prove: a
two-level category-prefixed secondary entry point, a real cross-package import,
the layer graph, partial compilation, and tree-shaking. Adding variants or
theming here would be an architecture decision smuggled in as a fixture
(CLAUDE.md rule 9).

`uniqueId` was chosen over a placeholder because it is genuinely the smallest
real foundation capability TEKAD has: every accessible widget needs stable,
unique ids to wire `aria-labelledby`, `aria-describedby` and `aria-controls`.

## Three things the build got wrong before the gates caught them

**Partial compilation was off.** ng-packagr reads
`tsConfig.options.compilationMode || 'full'`, so a library tsconfig that simply
_omits_ the setting silently produces a **fully compiled** package. Full
compilation bakes the current Angular version's private instruction set into the
output, and the package then breaks on a later Angular that changed those
internals — the exact failure the Angular Package Format's partial mode exists
to prevent.

ng-packagr does notice, and injects a `prepublishOnly` script that aborts. That
is a good backstop that fires on release day. `tools/verify-package-format.mjs`
asserts it at build time instead, and checks the FESM independently so the gate
does not depend on ng-packagr keeping that behaviour.

**`@tekad/core` declared an Angular peer it never used.** `@nx/dependency-checks`
flagged it and was right: nothing in the package imports `@angular/core`, and
declaring an unused peer makes every consumer install something the package
never touches. It was removed rather than silenced. It goes back the moment a
symbol there needs Angular.

**A sibling workspace package cannot be linked by its peer range alone.**
`@tekad/button` peer-depends on `@tekad/core`, and pnpm went looking for it on
the registry — where, per ADR-016, it must not exist yet. The peer declares what
a _consumer_ must supply; a `devDependencies` entry of `workspace:*` is what
links the sibling during development. Both are needed, and they mean different
things.

## Tree-shaking is measured, and the measurement is honest

ADR-004: "Tree-shaking is verified by a CI probe app, never assumed."
`tools/verify-treeshaking.mjs` builds `apps/treeshake-probe` once per scenario
against the **built** packages and asserts what reached the bundle.

Finding the right signal took three attempts, and the two rejected ones are
worth recording because they look reasonable:

| Signal                                | Verdict                                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identifier names (`TEKAD_VERSION`)    | **Useless.** Minified away whether or not the module survived, so its absence proves nothing.                                                                                                                |
| String literals (component selectors) | **Works** — but only for code that happens to contain a distinctive string, which pushes authors into planting markers in production code to keep the gate working.                                          |
| **Source-map `sources`**              | **Works for everything.** A production build lists exactly which source files contributed mappings. A fully tree-shaken module contributes none. Name-independent, minifier-independent, no instrumentation. |

Current results:

| Scenario                                      | Present in the bundle                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| import `@tekad/core/primitives/identity` only | identity **only** — not the primary entry point, not the component           |
| import `@tekad/button` only                   | button + identity (its real dependency) — **not** core's primary entry point |
| import `@tekad/core` only                     | core **only**                                                                |

The third scenario is the positive control. Every scenario asserts a presence as
well as an absence, and a scenario declaring no `mustInclude` is rejected as
malformed — because an absence proves nothing unless the same run demonstrates
the signal can show a presence.

## Entry-point boundaries

Spike B found that a relative import across an ng-packagr entry-point boundary
fails the build with

```
Cannot destructure property 'pos' of 'file.referencedFiles[index]' as it is undefined.
```

Correct outcome, useless message. `tools/verify-entrypoint-boundaries.mjs`
produces the readable error first: an entry point is any directory containing
`ng-package.json`, it owns everything beneath it until a nested one takes over,
and code reaches another entry point through its **public specifier**, never
through `../../`. Once published these are separate FESM bundles and a relative
path between them has no meaning.

It is a script rather than a custom ESLint rule on purpose. An ESLint rule would
give in-editor feedback, which is better — and would also mean publishing and
versioning a plugin package to hold one rule before TEKAD has a single real
component. It moves into a plugin when there are enough repo-specific rules to
justify one.

## Publish safety

Every package carries `"private": true`. ADR-016 blocks publishing until the
namespace and trademark gates pass, and `verify-package-format.mjs` reports any
package where `private` is not true, so removing it is a deliberate act rather
than a side effect.

## Still owed

- **A TEKAD secondary-entry-point generator.** The stock
  `@nx/angular:library-secondary-entry-point` emits a **flat, one-level** entry
  point containing an **NgModule** — wrong on both counts.
- **More probe scenarios as the graph grows.** Three scenarios over two packages
  is a working measurement, not a finished one. The things that actually defeat
  tree-shaking — DI tokens evaluated at import time, module-level side effects,
  `providedIn: 'root'` services — do not exist in this repo yet. The probe must
  grow a scenario each time one appears.
- **The packed-tarball import probe** (ADR-012's fourth boundary layer): install
  `npm pack` output into a clean project and import it, which is the only check
  that sees what a consumer actually receives.
