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

## Phase 3 — Reactive foundation (2026-08-29)

- [x] **No runtime code added, deliberately.** Angular already ships the
      boundary adapters ADR-003 describes, no caller exists for a normalisation
      helper, and a state framework is the failure mode this phase was warned
      about. Recorded in `docs/architecture/09-reactive-foundation.md`.
- [x] ADR-002's four stated review blockers turned into lint rules scoped to
      `packages/**`, each message naming its ADR and the correct alternative.
- [x] Nine self-test cases — five violations, four allowed forms. The allowed
      forms matter as much: a rule that rejected an event-stream `Subject` or a
      DOM-touching `effect()` would be enforcing something the ADRs never said.

Not done, intentionally: any reactive utility, `resource`/`httpResource`
integration, a `providedIn: 'root'` rule. Phase 4 (design tokens) next.

## Phase 4 — Design tokens & theme (2026-08-29)

- [x] `@tekad/theme`: three tiers, one shipped. 1.01 KB gzip total.
- [x] **Contrast asserted at build time, in both schemes**, over 12 pairs — and
      the gate cannot be silenced by deleting a `contrastWith` entry, because it
      independently checks that every `on-*` token has a partner.
- [x] **Proved rather than asserted** that OKLCH lightness is not WCAG
      luminance: five hues at identical lightness and chroma span 4.054:1 to
      4.550:1 on white, with the AA threshold inside the spread.
- [x] **Gamut fitting.** The first build failed with 19 out-of-gamut tones; the
      fix reduces chroma while holding lightness and hue, so the emitted colour
      is always the checked colour.
- [x] Colour maths pinned against published CSS Color 4 and WCAG values.
- [x] First numeric budget in the project, and only because ADR-007 stated it.

Not done, intentionally: the reset layer's contents, consumer brand seeds,
forced-colors substitutes, typography. Phase 5 (accessibility foundation) next.

## Phase 5 — Accessibility foundation (2026-08-29)

- [x] **Re-verified ADR-005's assumptions before building anything.** Both hold
      against `@angular/aria` 22.1.4, and two details the original grep missed
      (`scrollIntoView` ×3, `inert` ×6) are now recorded precisely.
- [x] `tools/verify-aria-assumptions.mjs` — a gate whose failure means an ADR
      needs rereading rather than that something is broken.
- [x] `@tekad/core/a11y/live-announcer` — the one gap this phase owns.
- [x] **15 behavioural assertions in real Chromium**, including the clear-then-
      set observed as `["", "three results"]`. Explicitly NOT claiming any
      screen reader was run.
- [x] `@angular/aria/private` banned by lint, with a public entry point as the
      negative case.
- [x] Phase 2's tree-shaking promise kept for the first `providedIn: 'root'`
      service, with a positive control.

Not done, intentionally: focus trap (Phase 6, with the floating layer),
directionality (CDK ships it). Phase 6 (overlay foundation) next — it is the one
phase whose evidence already exists, from P0.
