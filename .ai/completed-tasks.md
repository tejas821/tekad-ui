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

## Phase 6 — Overlay foundation (2026-08-29)

- [x] `@tekad/overlay` — P0's deferred-close primitive ported to TypeScript
      under strict settings, building clean.
- [x] The candidate's harness scaffolding (16 counters, two growing arrays per
      instance) replaced by an optional diagnostics sink.
- [x] 33 assertions against the **built** package, covering the whole §H5
      contract.
- [x] **The control is stronger than P0's record**: the pre-fix ordering does
      not re-enter once, it recurses without bound. Test caps the depth only so
      it can observe the recursion instead of dying of it.
- [x] Found a defect in the test rather than the code, and corrected it to
      measure the thing a leak would actually look like.
- [x] Narrowed the focus-trap requirement: `showModal()` already provides it at
      96.1%, so only the `position: fixed` fallback path needs a bespoke one.

Not done, intentionally: Floating UI positioning, the dismissal dispatcher, the
focus trap. Each waits for a call site. Phase 7 (forms foundation) next.

## Phase 7 — Forms foundation (2026-08-29)

- [x] **Tested ADR-013's central claim before building on it — and it was
      false.** Angular 22.1.4 does not forbid a control implementing both forms
      contracts; it silently prefers the `ControlValueAccessor` and never binds
      the signal-forms value model.
- [x] Corrected ADR-013 with a dated section. The decision is unchanged; only
      its stated reason was wrong, so no superseding ADR was needed.
- [x] `verify-forms-contracts.mjs` — now load-bearing rather than
      belt-and-braces, catching both routes to a CVA including the one that
      never names the interface.
- [x] `verify-forms-assumptions.mjs` re-runs the measurement every build, so a
      future Angular that starts rejecting the combination is noticed.
- [x] Two smaller corrections recorded, including one wrong conclusion that was
      caught before it was written down.

Not done, intentionally: `@tekad/forms`. The contract is Angular's, and the CVA
adapter belongs with the Phase 9 slice that gives it something to adapt.
Phase 8 (testing infrastructure) next — several stopgap browser drivers move
into it.

## Phase 8 — Testing infrastructure (2026-08-29)

- [x] **Wired Vitest, and found ADR-011 names an executor that cannot run this
      workspace.** `@angular/build:unit-test` refuses a `@nx/angular:package`
      build target — every library here. `@nx/angular:unit-test` works, and
      works by delegating to the same `executeUnitTestBuilder`, so the decision
      stands and only the name moves.
- [x] **Measured the unit-test DOM before trusting it.** jsdom, with no
      `showPopover`, `dialog.showModal`, `inert`, Web Animations or
      `matchMedia`. The overlay lifecycle proof therefore cannot move here as
      Phase 6 promised, and `unit-test-dom.spec.ts` asserts each absence so a
      jsdom upgrade fails and says the double may be retirable.
- [x] **Found that a green suite is not evidence.** Deleting the one line that
      makes a repeated live-region announcement audible left 9 of the
      announcer's 11 tests passing. Only 2 caught it.
- [x] `verify-mutation.mjs` — pairs each plausible defect with the test that
      must catch it and requires _that named test_ to fail. Seven mutants, all
      caught. Rejects three ways a red run can be meaningless: a surviving
      mutant, a mutant that broke the build, and a named test that no longer
      exists.
- [x] `verify-test-discovery.mjs` — asserts that what the executor discovers is
      exactly the specs on disk, by asking it (`--listTests`) rather than
      modelling the globs a second time. Found because `../**/*.spec.ts` was
      measured reaching into a sibling package.
- [x] 27 unit tests across `core`, `button` and `overlay`; 22 new gate
      self-tests; a dated correction on ADR-011.

Not done, intentionally: `size-limit` per-entry budgets, forced-colors
snapshots, the SSR/hydration test per package, and `axe` on every example. All
four need components to measure, and `TekadButton` is a packaging fixture — a
budget set against it would baseline something about to be deleted. Phase 9
(first vertical slice) is the first phase with anything real to measure, and
inherits all four along with ADR-013's CVA adapter.

Still unverified, stated again because a testing phase is exactly where it
would be tempting to imply otherwise: **no screen reader has been run.**

## Phase 9 — First vertical slice (2026-09-02)

- [x] **Discharged ADR-007's precondition before writing a component.** The SSR
      encapsulation cost was measured, and the assumption behind the obligation
      did not survive: the `_ngcontent` attribute costs +87.7% raw and nothing
      compressed. The cost is the component instance — a component per cell is
      +51% brotli. ADR-014 inherits it: a table cell is not a component.
- [x] `@tekad/button` made real; `@tekad/checkbox`, `@tekad/input`,
      `@tekad/form-field` and `@tekad/dialog` built.
- [x] **ADR-013's CVA adapter**, owed to this phase since Phase 7, with the
      token that makes the separation workable and a tree-shaking scenario
      proving it never reaches a signal-forms-only consumer.
- [x] **ADR-010's focus trap, measured away.** `showModal()` supplies the trap,
      the inertness, `aria-modal`, Escape and focus restoration. TEKAD writes
      none of it.
- [x] **`@layer` finally has evidence** — load-bearing since Phase 4 with
      nothing checking it.
- [x] Four browser gates over one shared probe app; 102 unit tests; 28 mutants,
      all caught.

Four foundation problems surfaced, none of which a unit suite could have found:
a component decorating a consumer's element must style it with `:host`;
projected content cannot be styled from the component it is projected into; a
foundation package's spec reached for a component; and `@layer` was unverified.
All four were caught by a gate on its first run.

Not done, intentionally: `axe`, forced-colors snapshots and per-package SSR
tests — all now measurable and none built. Select and the table foundation
remain. **No screen reader has been run**, and every browser number in this
phase is Chromium.

## 2026-09-19 — packaging proof (gates 9b and 14, and the generator)

- [x] **`tools/lib/tarball.mjs`** — a zero-dependency `npm pack` wrapper and a
      narrow ustar reader (GNU long name, pax local/global, checksum verified,
      unknown entry types throw). It asserts its own file list against npm's
      report: a reader that silently skips an entry would make every check above
      it vacuous.
- [x] **Gate 9b — the packed-tarball consumer boundary.** Packs every package,
      extracts the tarballs into a scratch consumer with no path mappings, and
      requires every shipped file to be reachable through an `exports` subpath,
      every public specifier to resolve and import, every internal one refused,
      the shipped `.d.ts` to type-check, and every bare import to be a declared
      dependency or peer.
- [x] **Gate 14 — per-entry size budgets**, on the packed tarball rather than
      through `size-limit` (ADR-011, dated correction). 2% tolerance; fails on
      an unbudgeted entry point or a budget nobody measures.
- [x] **`tools/generate-entry-point.mjs`** — the generator owed since Spike B.
      Reproduces all five committed entry points byte-identically.
- [x] **Two defects the new gates found and closed.** `@tekad/theme` shipped
      `styles/tekad.css` inside the tarball with its own `exports` map refusing
      every import of it; and `packages/core/project.json`'s test `include`
      globs did not cover `../forms/**`, so the `forms/*` entry points' specs
      would have been discovered-but-unrun.
- [x] **CI run 1 found three defects that only a clean checkout exposes.**
      `@nx/enforce-module-boundaries` skips entirely without a cached project
      graph (silent, exit 0) — `tools/ensure-project-graph.mjs` now warms it and
      the boundary self-test fails by name if it is ever skipped again;
      `smol-toml@1.6.1` (high, exact-pinned by nx) is now overridden to 1.7.1;
      and Playwright's browser was never installed, because pnpm blocks the
      install script that downloads it — the workflow installs Chromium
      explicitly before the behavioural gates.
- [x] **`pnpm run format:check` was red at HEAD.** 51 files, mostly documentation,
      had never been through prettier, so gate 2 could not have passed. Formatted
      repository-wide in its own commit rather than by widening `.prettierignore`.
