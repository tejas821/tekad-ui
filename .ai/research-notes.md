# Research notes

Evidence gathered so far. Every claim carries a source and a type.
`FACT` = stated by a primary source. `INFERENCE` = reasoned from facts.
`UNKNOWN` = not yet verified — do not act on it as if it were known.

---

## Angular v22 platform baseline
Source: https://angular.dev/reference/versions — primary — accessed 2026-08-26

- FACT — Angular v22.0.x supports Node `^22.22.3 || ^24.15.0 || ^26.0.0`.
- FACT — TypeScript `>=6.0.0 <6.1.0`.
- FACT — RxJS `^6.5.3 || ^7.4.0`.
- FACT — Angular v21.x supports Node `^20.19.0 || ^22.12.0 || ^24.0.0`,
  TypeScript `>=5.9.0 <6.0.0`.
- INFERENCE — TEKAD peer ranges and the CI matrix should mirror the v22 row
  exactly; widening them without testing would be an unverified claim.

## Angular v22 release
Source: https://blog.angular.dev/announcing-angular-v22-c52bb83a4664 — primary — accessed 2026-08-26

- FACT — `OnPush` is now the default change-detection strategy for new
  components; the previous default is renamed `ChangeDetectionStrategy.Eager`.
- FACT — Signal Forms are **stable**, with documentation and Material/Aria
  support.
- FACT — `resource` and `httpResource` provide signal-native async reactivity.
- FACT — `@Service` replaces `@Injectable({providedIn:'root'})` for most uses;
  `injectAsync` enables lazy DI.
- FACT — Webpack-based builders and `@ngtools/webpack` are deprecated.
- FACT — `@boundary` error-handling syntax is developer preview, Q3 2026.
- INFERENCE — OnPush-by-default plus stable Signal Forms means TEKAD's
  signal-canonical model (ADR-002) is aligned with the framework's own
  direction rather than working against it.
- INFERENCE — Do not build any tooling on webpack builders.

## Angular Aria — the most consequential finding
Source: https://angular.dev/guide/aria/overview — primary — accessed 2026-08-26

- FACT — `@angular/aria` is "a collection of headless, accessible directives
  that implement common WAI-ARIA patterns".
- FACT — Behaviour-only: handles keyboard interaction, ARIA attributes, focus
  management and screen-reader support; ships **no** styles and imposes no
  markup structure.
- FACT — 13 patterns: autocomplete, listbox, select, multiselect, combobox,
  menu, menubar, toolbar, accordion, tabs, tree, grid.
- FACT — Graduated to production in v22 with stabilised APIs and test
  harnesses.
- FACT — The overview page does **not** describe its relationship to
  `@angular/cdk`.
- INFERENCE — This covers a large share of TEKAD's intended Pattern layer.
  Reimplementing it would contradict KEEP / NEVER BUILD.
- UNKNOWN — exact license and version; bundle cost; SSR/hydration behaviour;
  per-pattern coverage against TEKAD's intended components; CDK overlap;
  whether it constrains TEKAD's public API design.
- → ADR-005 (Proposed — blocked on research)

## Session workspace tooling
Detected in the session's Linux workspace VM, not the founder's macOS machine.

- FACT — node v22.23.2, npm 10.9.8, git 2.34.1; pnpm, yarn and `ng` absent.
- FACT — node v22.23.2 satisfies Angular v22's `^22.22.3` requirement.
- UNKNOWN — the founder's local Node, package manager and Angular CLI versions.
  Verify before Phase 1.

---

## Open questions carried into the research phase

1. `@angular/aria` vs `@angular/cdk` vs in-house — what does TEKAD own? (ADR-005)
2. Overlay foundation: CDK, platform Popover/Anchor Positioning, or custom? (ADR-010)
3. Monorepo tooling and package manager, chosen on measured evidence. (ADR-012)
4. Concrete package topology and namespace `@tekad-ui/*` vs `@tekad/*`. (ADR-004)
5. Generated-CSS cost of the three-tier token model — measured, not estimated. (ADR-007)
6. Table architecture: composable primitives + enterprise grid layer, or layered
   table/data-grid packages?
7. Charts: wrappers, or documented recipes only? (ADR-008)
8. Trademark and npm/GitHub availability for TEKAD — **unresearched**.
9. Dependency license matrix — **unresearched**.
10. Contributor IP model: DCO vs CLA — **unresearched**.

## Discipline
Do not re-derive these findings each session. Add to this file; do not rewrite
it. If a finding is superseded, mark it and cite the newer source.
