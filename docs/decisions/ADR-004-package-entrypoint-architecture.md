# ADR-004 — Package & entry-point architecture

**Status:** Accepted (principles) / Accepted (topology, since 2026-08-28 — see Spike A below) · **Date:** 2026-08-26

## Context

Package topology is one of the most expensive decisions to reverse: it is
baked into every consumer's import statements.

## Decision (principles — Accepted)

1. Hybrid topology: **capability packages** with **secondary entry points**,
   not one monolith and not one-package-per-file.
2. A package boundary requires an independently consumable capability.
3. Installing one component must not pull unrelated components or any
   optional integration.
4. No repository-wide barrel; no internal import paths; `exports` maps enforce
   the public surface.
5. Accurate `sideEffects`; ESM; correct types; no import-time work.
6. Dependencies flow downward only; cycles fail the build.
7. Tree-shaking is verified by a CI probe app, never assumed.

## Decision (topology — Proposed)

The illustrative package list in `docs/architecture/01-package-strategy.md`
is a working sketch. Two questions stay open until the research pass:
whether a11y and overlay are packages or entry points of `primitives`, and
whether the namespace is `@tekad-ui/*` or `@tekad/*` (also a legal question).

## Alternatives

Single `@tekad-ui/ui` — rejected, bets the architecture on tree-shaking.
Component-per-package for everything — rejected, version churn without gain.

## Reason

Consumers should pay for what they use, with an install story that stays
humane.

## Consequences

Higher build/release complexity; a release tool that handles many packages is
required (ADR-012). Publishing before the namespace question is settled is
forbidden.

---

## 2026-08-27 — research resolution and one new open question

Resolved: two-level, category-prefixed entry points
(`@tekad/core/components/button`); ng-packagr generates the exports map with no
wildcard subpath, so `./src/*` is unimportable by default (assert in CI);
namespace `@tekad/*` subject to ADR-016's gates; target Material's
per-entry-point FESM + shared-chunk splitting, which stock ng-packagr does not
produce.

**Entry-point granularity is now provisional.** `angular/angular#40407` —
"VS Code auto-import doesn't identify secondary entry points" — is a
long-standing **open** issue. If a developer pastes `<tekad-button>` and the
IDE cannot offer the import, the first five minutes are lost. Verify whether
it is fixed in the v21/v22 language service, test WebStorm separately, and
measure the real tree-shaking delta with the CI probe before committing.
See `docs/research/17-documentation-dx-strategy.md`.

---

## 2026-08-28 — Spike A resolves the granularity question

**Entry-point granularity is no longer provisional.** The concern above was
that a developer could not get the symbol imported. Measured, not assumed:

Spike A drove **tsserver over its stdio protocol** — the same machinery VS Code
runs — against a fixture whose `exports` map mirrors ng-packagr output, with a
primary-entry-point-only **control** package in the same run.

| Probe                              | Offered | Import inserted                                               |
| ---------------------------------- | ------- | ------------------------------------------------------------- |
| Control (primary entry point only) | ✔       | `import { TekadControlSymbol } from "@tekad/legacy-single"`   |
| Secondary entry point              | ✔       | `import { TekadButton } from "@tekad/core/components/button"` |

`probeValid: true` (TypeScript 6.0.3). **OBSERVED** — tsserver resolves subpath
`exports` for auto-import and inserts the correct deep specifier. This is the
path that matters: adding a standalone component to `imports: [...]` is an
ordinary TypeScript symbol completion.

The two-level, category-prefixed topology therefore **stands as Accepted**.

**Residual risk, tracked not dismissed.** The Angular Language Service path
(type `<tekad-button>` in a template, editor adds it to `imports`) is
**UNVERIFIED** — the plugin would not attach in this environment and returned
zero entries _including for the control_, so no conclusion may be drawn either
way. If it turns out not to work with secondary entry points the consequence is
a degraded convenience, not a broken workflow. Verify in a real VS Code /
WebStorm session before publishing DX documentation that promises it.

Evidence: `docs/research/prototypes/spike-a-autoimport/`.

The remaining open item on this ADR is unchanged: **measure the real
tree-shaking delta with the CI probe app** (Phase 2) before treating the
granularity as load-bearing for bundle size.

---

## 2026-08-28 — Spike B measures the packaging end

Spike A proved the _consumption_ end (tsserver offers the deep import).
Spike B measures the _production_ end, with a real ng-packagr 22 build.

**Two-level, category-prefixed entry points build.** A hand-authored
`components/input/` directory with its own `ng-package.json` was
**auto-discovered by directory scan** — no registration — and emitted:

```json
"exports": {
  "./package.json":     { "default": "./package.json" },
  ".":                  { "types": "./types/…​.d.ts", "default": "./fesm2022/…​.mjs" },
  "./button":           { "…": "…" },
  "./components/input": { "…": "…" }
}
```

with `"sideEffects": false` and **no wildcard subpath** — `./src/*` is
unimportable by default, confirming the property the CI assertion must _keep_
rather than create. This is exactly the shape Spike A proved tsserver resolves,
so the topology is now evidenced **end to end**. OBSERVED.

**Shared code is not duplicated.** A relative import across an entry-point
boundary fails the build (with an unhelpful internal crash — see ADR-012). The
sanctioned package-name import succeeds, and the shared symbol appears **once**,
in the primary FESM; each secondary FESM keeps a bare unresolved
`import { … } from '@tekad/core'`.

This **corrects** the research note that stock ng-packagr lacks Material's
shared-chunk splitting. Accurate: ng-packagr emits no shared _chunk files_, but
does not duplicate either — it defers deduplication to the consumer's bundler.
The outcome that matters holds.

**Tree-shaking measured.** A ballast symbol exported from the primary entry
point and used by nothing was searched for in a production bundle of an app that
imported **only** `…/components/input`, consuming the **built** package from
`node_modules`:

| Check                                          | Result                  |
| ---------------------------------------------- | ----------------------- |
| Component reached the bundle                   | ✔                       |
| Shared helper it actually uses                 | ✔                       |
| Unused primary-entry-point ballast             | ✘ — tree-shaken         |
| Positive control (ballast explicitly imported) | ✔ present → probe valid |

**The CI tree-shaking probe app remains REQUIRED.** One ballast symbol in one
app shows the mechanism works; it says nothing about TEKAD's real package graph,
where DI tokens, module-level side effects and `providedIn: 'root'` services are
what actually defeat tree-shaking. The requirement is now known to be
_achievable_ — a different claim from _satisfied_.

**New Phase 1 work item.** `@nx/angular:library-secondary-entry-point` emits a
**flat, one-level** entry point containing an **NgModule** — wrong on both
counts for a standalone-only, two-level topology. TEKAD needs its own generator
or a documented manual convention.

Evidence: `docs/research/prototypes/spike-b-nx-angular-build/`.
