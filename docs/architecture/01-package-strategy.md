# Package & Entry-Point Strategy

Status: **principles Accepted; concrete topology Proposed** (ADR-004).
Final topology requires the research phase or an explicit founder decision.

## 1. Rejected extremes

| Model                        | Why rejected                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One `@tekad-ui/ui` package   | Consumers pay for the whole ecosystem; tree-shaking becomes the only defence and it is not reliable enough to bet the architecture on. |
| One package per file/utility | Version churn, install friction, dependency-graph noise, no ergonomic win.                                                             |

## 2. Chosen shape: hybrid — capability packages with secondary entry points

A package boundary exists where a **meaningful, independently consumable
capability** exists. Inside a package, secondary entry points expose
sub-capabilities without splitting the release unit.

Illustrative — **not yet ratified**:

```
Foundation
  @tekad-ui/theme          tokens, themes, density
  @tekad-ui/primitives     headless behaviour
  @tekad-ui/a11y           focus, live region, id, dir  (may fold into primitives)
  @tekad-ui/overlay        positioning, stacking, dismiss   (see ADR-010)
  @tekad-ui/forms          control integration
  @tekad-ui/testing        harnesses

Components
  @tekad-ui/button  @tekad-ui/input  @tekad-ui/select
  @tekad-ui/dialog  @tekad-ui/table  ...

Optional integrations (never a core dependency)
  @tekad-ui/charts-chartjs
  @tekad-ui/charts-d3
```

Open: whether `@tekad-ui/a11y` and `@tekad-ui/overlay` are separate packages
or entry points of `@tekad-ui/primitives`. Decide with evidence, not taste.

## 3. Rules

1. Every published entry point is independently installable and independently
   useful.
2. Installing `@tekad-ui/button` must not pull `table`, `tree`, `datepicker`
   or any chart package.
3. No repository-wide barrel. There is no `@tekad-ui/everything`.
4. Consumers never import an internal path. `exports` maps enforce this —
   `./src/*` and `./internal/*` are not exported.
5. `sideEffects` is declared accurately in every `package.json`. No global
   registration, no import-time side effects.
6. ESM output with correct `types` and Angular package metadata.
7. Dependencies point **downward** in the layer graph. Cycles are a build
   failure, not a review comment.

## 4. Verification, not assumption

Tree-shaking is verified, never assumed. CI builds a probe app that imports
exactly one component and asserts that no unrelated TEKAD component appears in
the emitted JS or CSS. See `06-ci-quality-gates.md`.

Four things are verified about a package boundary rather than asserted:

1. **The declarations and the exports map** — `tools/verify-package-format.mjs`
   (gate 9), against built output.
2. **What a consumer actually receives** — `tools/verify-consumer-boundary.mjs`
   (gate 9b) packs every package with the real `npm pack`, extracts the tarballs
   into a scratch consumer, and requires every shipped file to be reachable
   through an `exports` subpath, every public specifier to resolve and import,
   every internal one (`…/src/…`, a raw `fesm2022/*.mjs`) to be refused, the
   shipped `.d.ts` files to type-check, and every bare import to be a declared
   dependency or peer. `dist/` is not what a consumer gets; this gate is the one
   that reads what they do.
3. **Size** — `tools/verify-size-budget.mjs` (gate 14) budgets the packed
   tarball and every entry point's bytes against `tools/size-budget.json`.
4. **New entry points** — `tools/generate-entry-point.mjs` writes the
   `ng-package.json`, the `src/index.ts`, the `tsconfig.base.json` path mapping
   and the package's test-`include` glob, so a second-level entry point cannot
   be added in a shape the stock generator emits (a flat one containing an
   NgModule) or with specs that silently never run.

## 5. Namespace

`@tekad-ui/*` is the working namespace. `@tekad/*` vs `@tekad-ui/*` and npm /
GitHub / trademark availability are **open questions** for the legal research
pass (`02-LEGAL-IP-RESEARCH-PROMPT.md` §7). Do not publish anything until that
is settled.
