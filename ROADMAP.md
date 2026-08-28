# TEKAD Implementation Roadmap

Status as of 2026-08-27: **Phase 0 and Phase 0.5 complete. Two prototypes (P0, P1) now gate Phase 1.**

Phases are ordered by dependency, not by visible progress. The temptation to
skip ahead to components is the single biggest risk to this project.

---

## Phase 0 — Foundation ✅ complete

Repository inspected; platform baseline verified from primary sources;
`CLAUDE.md`, `.ai/` state, architecture docs and ADR-000…012 written.
No code. Deliberately.

## Phase 0.5 — Research ✅ complete

All nine areas researched; 17 documents in `docs/research/`;
`IMPLEMENTATION_HANDOFF.md` produced; ADRs promoted.

## Phase 0.75 — Prototypes ⛔ **blocking**

- [ ] **P0** CSS `overlay` exit-animation behaviour in Firefox/Safari (ADR-010)
- [ ] **P1** `@angular/aria` `ngGridCell` under `@for` rendering (ADR-014)
- [ ] Verify angular/angular#40407 (auto-import vs secondary entry points)
- [ ] Nx spike: does `@nx/angular` 23.1.1 avoid `@angular-devkit/build-angular` on v22?

<details><summary>Original Phase 0.5 checklist (now complete)</summary>

The repository's own README states the order: research → decide → implement.
The research prompts exist; the research does not. Six decisions are parked.

Minimum to unblock Phase 1:

- [ ] ADR-012 — monorepo tooling + package manager (measured)
- [ ] ADR-005 — `@angular/aria` verdict: license, bundle, SSR, coverage, CDK overlap
- [ ] ADR-010 — overlay foundation: CDK vs platform APIs vs custom
- [ ] ADR-004 — concrete package topology
- [ ] ADR-007 — token model with a measured CSS cost

Needed before **any** publish, and separable from the above:

- [ ] Trademark / npm / GitHub namespace research (`02-LEGAL-IP-RESEARCH-PROMPT.md`)
- [ ] Dependency license matrix
- [ ] Contributor IP model (DCO vs CLA)
- [ ] `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`

Output: `docs/research/*` plus `IMPLEMENTATION_HANDOFF.md` at the root.

</details>

## Phase 1 — Workspace foundation
Monorepo scaffold per ADR-012. Git init. Lint, format, typecheck, CI skeleton.
Dependency-boundary enforcement wired from day one — retrofitting it is
painful once packages exist.

## Phase 2 — Package & entry-point architecture
Realise ADR-004: build config, `exports` maps, `sideEffects`, package
validation, and the tree-shaking probe app. Prove the packaging model with two
trivial packages before real components exist.

## Phase 3 — Reactive foundation
The signal-canonical utilities and the RxJS boundary adapter (ADR-002/003).
Small. Resist building a state framework.

## Phase 4 — Design tokens & theme
Primitive → semantic → component tokens. Light, dark, density. Measure the
generated CSS and set the first budget.

## Phase 5 — Accessibility foundation
Per the ADR-005 verdict. If `@angular/aria` is adopted, this phase is thin:
TEKAD builds only the gaps.

## Phase 6 — Overlay foundation
Per ADR-010. Blocks Dialog and every overlay-based component.

## Phase 7 — Forms foundation
Signal Forms (stable in v22) plus reactive-forms/CVA integration. One forms
story, not a competing framework.

## Phase 8 — Testing, CI & performance infrastructure
Per ADR-011 and `docs/architecture/06-ci-quality-gates.md`. Establish benchmark baselines here —
budgets become real numbers only once something exists to measure.

## Phase 9 — First vertical slice
Button · Icon · Input · Form Field · Label · Checkbox · Switch · Dialog ·
Select · Table foundation.

The slice's purpose is to **prove the architecture**, not to fill a catalogue:
packaging, theming, signals, RxJS consumption, forms, accessibility, testing,
docs, tree-shaking and SSR all exercised end to end. If any of those hurts
here, fix the foundation before adding components.

## Phase 10 — Composable patterns
Promote the reusable behaviour the slice revealed. Only what the slice
actually demanded.

## Phase 11 — Enterprise components
Table / Data Grid first — it is the flagship and the hardest architectural
test. Then by evidence of demand and architectural value, not by catalogue
envy.

## Phase 12 — Optional integrations
Charts as separate optional packages, or recipes only (ADR-008).

## Phase 13 — Documentation site
A first-class product, not an afterthought. Live examples, API reference,
accessibility and theming guidance, recipes.

## Phase 14 — Performance hardening
Against real budgets and real regressions.

## Phase 15 — Release engineering
Independent versioning, changelogs, provenance, publish allowlist, rollback.

---

## Standing risks

| Risk | Impact | Mitigation |
|---|---|---|
| Implementing before research | Expensive, hard-to-reverse architecture | Phase 0.5 gate; blocked ADRs |
| Rebuilding what `@angular/aria` already ships | Permanent maintenance cost, worse a11y | ADR-005 before Phase 5 |
| Package topology churn after publish | Breaks every consumer's imports | ADR-004 before Phase 2 |
| Name/trademark conflict discovered late | Rename after adoption | Legal research before publish |
| Scope creep into a component catalogue | Foundation never finishes | Phase 9 slice is fixed and small |
| Unmeasured performance claims | Credibility loss | No claim without a benchmark |
