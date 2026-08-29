# Completed tasks

## Phase 0 — Repository inspection & foundation (2026-08-26)

- [x] Inspect repository state; confirm no code, no git, no tooling
- [x] Read existing research prompts and README
- [x] Verify Angular / Node / TypeScript / RxJS baseline from primary sources
- [x] Identify Angular v22 capabilities that change build-vs-reuse decisions
- [x] Create `CLAUDE.md` (AI constitution)
- [x] Create `.ai/` state files
- [x] Create architecture documentation (7 documents)
- [x] Establish package & entry-point strategy
- [x] Establish dependency admission policy
- [x] Establish public/internal/experimental API rules
- [x] Establish testing strategy
- [x] Establish performance measurement approach and budget scope
- [x] Establish CI quality gates
- [x] Create ADR-000 through ADR-012
- [x] Produce implementation roadmap (`ROADMAP.md`)
- [x] Record blockers and open questions

Not done, intentionally: any source code, workspace scaffold, `package.json`,
CI config, or `LICENSE`.

## Phase 0.5 — Research (2026-08-27)

- [x] Competitive analysis: Material/CDK/Aria, Taiga UI, PrimeNG, NG-ZORRO,
      ng-bootstrap, Clarity, Ionic, Radix NG, ng-primitives, Spartan
- [x] Angular v22 platform capabilities (aria, CDK, signals/RxJS, Signal Forms,
      SSR/hydration, library authoring)
- [x] Monorepo, packaging, entry-point and release tooling
- [x] Overlay and positioning platform APIs
- [x] CSS, design tokens and theming
- [x] Table and data-grid architecture
- [x] Licence analysis and dependency licence matrix
- [x] Trademark, npm and GitHub namespace (preliminary)
- [x] Documentation, governance and security baseline
- [x] 17 research documents written to `docs/research/`
- [x] `IMPLEMENTATION_HANDOFF.md` produced
- [x] ADR-005/007/010/011/012 promoted; ADR-013…017 created; ADR-004 annotated
- [x] `.ai/` state updated

Not done, intentionally: any source code, workspace scaffold, `package.json`,
CI config, or `LICENSE`.

## Phase 0.75 — Prototype gates (2026-08-27 … 2026-08-28)

- [x] **P0** — overlay exit lifecycle across engines. CLOSED, CONDITIONAL GO.
      Architecture locked: top-layer substrate + deferred close as the single
      exit path. Native CSS `overlay` rejected (not author-settable, therefore
      never a foundation). 4 harness defects and 2 real implementation defects
      found and fixed. Firefox UNVERIFIED and labelled as such throughout.
- [x] **P1** — `ngGridCell` under `@for`. CLOSED, GO. `cdk-table` control
      reproduced angular/components#32603, so the test is non-vacuous. One new
      normative requirement: consumer-supplied cell templates must receive the
      row's insertion-site injector.

## Phase 0.9 — Pre-scaffold spikes (2026-08-28)

- [x] **Spike A** — auto-import vs secondary entry points (ADR-004).
      Q1 RESOLVED: tsserver 6.0.3 offers the deep import; control passed.
      Q2 UNVERIFIED: the Angular Language Service would not attach, and the
      control returned zero entries too, so nothing may be concluded.
      ADR-004's entry-point granularity is no longer provisional.
- [x] **Spike B** — Nx/Angular build routing (ADR-012). GO.
      `@nx/angular` 23.1.1 routes through `@angular/build`; both builds succeed
      with `@angular-devkit/build-angular` removed from disk. Also measured
      two-level entry points, cross-entry-point imports and tree-shaking, and
      surfaced three Phase 1 scaffolding constraints Nx's defaults would
      otherwise have imposed silently.
- [x] ADR-004 and ADR-012 updated; no ADR remains provisional.
- [x] `.ai/` state updated.

Not done, intentionally: any source code, workspace scaffold, `package.json`,
CI config, or `LICENSE`. Phase 1 starts now.

## Phase 1 — Workspace foundation (2026-08-28)

- [x] `git init`, initial commit `f1965c5` — 121 files, the first history this
      repository has had.
- [x] Nx 23.1.1 + pnpm 11.24.0 workspace, built from an empty base rather than
      a preset, on the legacy TypeScript setup Angular actually supports.
- [x] Angular pinned to 22.1.4 explicitly, so the code stays on the version the
      P0 and P1 gates were measured against.
- [x] ESLint 10 + typescript-eslint 8 + angular-eslint 22, prettier, strict
      TypeScript with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- [x] Dependency-boundary rules wired **before** any package exists, with
      fixtures that exercise the layer graph in both directions.
- [x] Five CI gates, each with a self-test. Three of the five were wrong or
      vacuous on first implementation; the self-tests are why that is known.
- [x] Two-scope licence and vulnerability audits, with written, expiring
      exceptions for build tooling and no exception path for shipped code.
- [x] `docs/architecture/07-workspace-foundation.md` records every deviation
      from the default scaffold and why it was measured, not assumed.

Not done, intentionally: `LICENSE` (blocked by ADR-015 until ADR-016's gates
pass), any package, any component. Phase 2 next.

## Phase 2 — Package & entry-point architecture (2026-08-29)

- [x] `@tekad/core` with a two-level `./primitives/identity` secondary entry
      point, and `@tekad/button` depending on it — the ADR-004 topology as
      running code rather than a diagram.
- [x] `uniqueId` chosen over a placeholder: it is the smallest genuinely real
      foundation capability TEKAD has, since every accessible widget needs
      stable unique ids for `aria-labelledby` and friends.
- [x] **Partial compilation fixed and gated.** The first build silently emitted
      a fully compiled package because ng-packagr defaults to `full` when the
      setting is absent.
- [x] **Tree-shaking measured**, discharging ADR-004's standing requirement for
      the current graph. Two plausible signals were tried and rejected before
      settling on source-map `sources`.
- [x] Entry-point boundary gate — Spike B's unreadable ng-packagr crash now
      arrives as a readable error first.
- [x] Three new gates, each with a self-test.
- [x] `docs/architecture/08-package-architecture.md`.

Not done, intentionally: `LICENSE`, any real component, the TEKAD entry-point
generator, the packed-tarball probe. Phase 3 (reactive foundation) next.
