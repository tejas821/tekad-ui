# CLAUDE.md — TEKAD AI Constitution

Stable working rules for any AI agent operating in this repository.
This file is **not** a copy of the Engineering Implementation Master Prompt.
It is the short, durable contract. Authoritative detail lives in `docs/`.

---

## 1. What TEKAD is

TEKAD is an open-source, Angular-22-first UI **ecosystem** for product,
enterprise and FinTech applications. The goal is not the largest component
count. The goal is the best architecture for the components TEKAD chooses
to own.

## 2. Non-negotiable rules

1. **Philosophy:** KEEP → IMPROVE → COMPOSE → DEFER → NEVER BUILD.
2. **One source of truth, two consumption models.** Signals are the canonical
   internal reactive model. RxJS/Observable surfaces are _adapters_ derived
   from that model — never a second store. See ADR-002, ADR-003.
3. **Angular 22-first.** No legacy-compatibility contamination. The
   "Legendary" series for Angular ≤21 is a separate future codebase. See
   ADR-001, ADR-009.
4. **Standalone-first.** NgModules are not a public API.
5. **Composition over configuration.** No boolean-flag explosion. See ADR-006.
6. **Independently consumable entry points.** Installing one component must
   not pull the ecosystem. See ADR-004.
7. **Never build a chart engine.** Charts are optional, separate packages.
   See ADR-008.
8. **Accessibility, security and correctness are never traded for speed.**
9. **No speculative abstraction.** Every abstraction needs a concrete current
   use, a measured benefit, or an ADR.
10. **Independent implementation.** Study public concepts and standards; never
    copy source, docs, distinctive APIs, assets or branding.

## 3. Decision priority

Correctness → Accessibility → Security → Performance → API quality →
Maintainability → DX → Visual richness → Implementation convenience.

## 4. Where the authority lives

| Question                | Read                                          |
| ----------------------- | --------------------------------------------- |
| Architecture overview   | `docs/architecture/00-overview.md`            |
| Packages / entry points | `docs/architecture/01-package-strategy.md`    |
| Public vs internal API  | `docs/architecture/02-public-api-rules.md`    |
| Adding a dependency     | `docs/architecture/03-dependency-policy.md`   |
| Testing expectations    | `docs/architecture/04-testing-strategy.md`    |
| Performance budgets     | `docs/architecture/05-performance-budgets.md` |
| CI gates                | `docs/architecture/06-ci-quality-gates.md`    |
| Any settled decision    | `docs/decisions/ADR-*.md`                     |
| Current work            | `.ai/state.json`, `.ai/current-task.md`       |
| Plan                    | `ROADMAP.md`                                  |

If an ADR answers the question, follow it. Changing an ADR requires a new ADR
that supersedes it — not an inline edit.

## 5. Working method (every task)

1. Read `.ai/state.json` and `.ai/current-task.md`.
2. Check `docs/decisions/` for an existing decision.
3. Identify the smallest relevant file set. Targeted search, not repo sweeps.
4. Search for an existing abstraction before creating one.
5. Implement the smallest correct solution.
6. Test. Measure where a budget applies.
7. Review the public API surface and the full `git diff`.
8. Update docs and `.ai/` state.
9. Report concisely.

Do not re-explain the architecture in every response. Do not re-read the
whole repository. Do not regenerate unchanged files.

## 6. Definition of Done

A change is done when: implementation is complete; the public API is
intentional; types are correct; tests exist and pass; accessibility is
verified behaviourally (not by attribute-counting); SSR/hydration is
considered; the package builds; lint and typecheck pass; docs are updated;
dependency and bundle impact are reviewed; the diff contains nothing
unrelated; and no architectural invariant was weakened.

"It compiles" is not done.

## 7. Stop conditions

Stop and ask for a decision when: a public API is materially ambiguous; a
breaking change looks necessary; a dependency carries licensing or security
risk; a performance regression is significant; a circular dependency would be
required; the work conflicts with an existing ADR; or the requirement cannot
be safely inferred.

Never invent a permanent public API merely to keep moving.

## 8. Current phase

**Phases 0, 0.5, 0.75, 0.9 and 1 are complete. Code has started.**

`IMPLEMENTATION_HANDOFF.md` is the authoritative implementation input — read it
instead of the research corpus. **All 18 ADRs are Accepted; none is provisional.**

### The four evidence gates are closed

| Gate                                              | Result                     | Artifact                                             |
| ------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| **P0** overlay exit lifecycle                     | CONDITIONAL GO             | `docs/research/prototypes/p0-overlay/`               |
| **P1** `ngGridCell` under `@for`                  | GO                         | `docs/research/prototypes/p1-aria-grid/`             |
| **Spike A** auto-import vs secondary entry points | Q1 resolved, Q2 unverified | `docs/research/prototypes/spike-a-autoimport/`       |
| **Spike B** Nx/Angular build routing              | GO                         | `docs/research/prototypes/spike-b-nx-angular-build/` |

Cite the artifact, not this file, when an ADR needs evidence.

### What Phase 1 built, and the habit it establishes

The workspace scaffold: Nx 23.1 + pnpm 11, the legacy TypeScript setup, Angular
pinned to 22.1.4, and five CI gates. See
`docs/architecture/07-workspace-foundation.md`.

**Three of those five gates were wrong or vacuous on their first
implementation**, and only a self-test revealed it. `@nx/enforce-module-boundaries`
cannot see an import of a package that is not installed; the licence check
flagged a package whose LICENSE merely _mentions_ the GPL; the webpack-builder
check went red on a clean lockfile.

So: **a guard ships with a test that proves it fails when it should.** This is
not a style preference. It is the difference between an enforced invariant and
a comment. `pnpm run verify:gates` runs them.

### Next: Phase 2 — package & entry-point architecture

Realise ADR-004 with two trivial packages before any real component exists:
`exports` maps, `sideEffects`, package validation, and the tree-shaking probe
app. Spike B measured that entry-point tree-shaking _can_ work; that is not the
same as it holding for TEKAD's real package graph, where DI tokens, module-level
side effects and `providedIn: 'root'` services are what actually defeat it.

Three items Spike B added to Phase 2:

- a TEKAD secondary-entry-point generator — the stock one emits a flat,
  one-level entry point containing an **NgModule**;
- a lint rule forbidding relative imports across an entry-point boundary —
  ng-packagr catches them, but with an unreadable internal crash;
- re-measure the `@angular-devkit/build-angular` install path under pnpm; Spike
  B ran on npm.

**Publish gate:** nothing is published, and `LICENSE` is not committed, until
ADR-016's namespace and trademark gates pass.
