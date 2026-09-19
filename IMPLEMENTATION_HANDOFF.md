# TEKAD — Implementation Handoff

Produced 2026-08-27 from the research corpus in `docs/research/`.
**Read this instead of re-reading the research.** Follow the links only when
resolving a specific question.

Every fact below was verified from a primary source — npm registry metadata,
unpacked published tarballs, official documentation, caniuse/MDN, or W3C
specifications. Bundle figures were measured, not estimated.

---

## NON-NEGOTIABLE DECISIONS

1. **Angular 22-first.** Node `^22.22.3 || ^24.15.0 || ^26.0.0`, TypeScript
   `>=6.0.0 <6.1.0`, RxJS `^6.5.3 || ^7.4.0`. Peer ranges are forward
   compatible: `^22.0.0 || ^23.0.0`.
2. **Signals canonical.** RxJS appears only as a `toObservable` adapter at the
   public boundary, or inside genuinely asynchronous pipelines. No mirrored
   `BehaviorSubject`. No `effect()` used as assignment.
3. **Standalone-first.** NgModules are not public API.
4. **Licence: Apache-2.0**, no NOTICE file at launch, plus `TRADEMARK.md`.
5. **Contributor model: DCO. No CLA.**
6. **Package manager: pnpm.** Non-negotiable — it makes phantom dependencies
   an install-time error.
7. **Zero lifecycle scripts** in every published package.
8. **Never build:** a chart engine, a rich-text engine, a third forms
   framework, or any WAI-ARIA pattern `@angular/aria` already ships.
9. **Accessibility, security and correctness are never traded for speed.**

---

## APPROVED ARCHITECTURE

```
Foundation   tokens, theme, build/test infrastructure
Primitive    headless behaviour TEKAD owns: overlay, focus, dismiss, ids, dir
Pattern      @angular/aria patterns + TEKAD gap-fillers
Component    ready-to-use, styled, typed, Signal-Forms-integrated
Enterprise   data grid, and later
```

Dependencies flow downward only; cycles fail the build.

- **Behaviour core / thin directive split** — a DOM-agnostic, signal-driven
  state machine wrapped by a directive that binds it to a host element. This
  is `@angular/aria`'s own shape and the most transferable idea found.
- **Composition via `hostDirectives`**, content projection and DI providers.
  Not inheritance — Angular v22 removed rest-argument constructors across
  `angular/components`, designing inheritance-based extension out.
- **`[data-*]` state contract is public API.** `[data-open]`, `[data-disabled]`
  and similar are documented and versioned, so any styling strategy can hook
  in without TEKAD shipping styling opinions.
- **No mandatory root wrapper component.** Use an injectable overlay service
  and `:root` token declarations.

---

## APPROVED PACKAGE TOPOLOGY

Capability packages with **two-level, category-prefixed** entry points:
`@tekad/core/components/button`, `@tekad/core/directives/appearance`,
`@tekad/<pattern>/testing`. Flat namespaces blur past ~100 entry points.

- ng-packagr generates the `exports` map with **no wildcard subpath**, so
  `./src/*` is unimportable by default. Never hand-write a `"./*"` fallback
  and never set `typesVersions`. **Assert both in CI.**
- `sideEffects` defaults to `false`; declare accurately where it is not.
- ng-packagr **throws** on non-peer `dependencies` outside
  `allowedNonPeerDependencies`, and injects a `prepublishOnly` guard against
  non-partial compilation — which does not fire under `--ignore-scripts`, so
  assert `compilationMode: "partial"` in CI too.
- **Target Material's per-entry-point FESM + shared-chunk splitting.** Stock
  ng-packagr does not produce it; budget explicit work or accept coarser
  bundles in v1 and measure the difference.
- **Tooling: Nx 23.1 + pnpm**, with two standing conditions — accept a 4–8
  week lag on each Angular major, and **do not depend on Nx remote caching**
  (deprecated, commercially licensed, withdrawn over CVE-2025-36852, whose
  threat model is an OSS repo taking fork PRs). Local cache + `nx affected`
  only; remote-cache writes from `main` alone.
- **Release: Nx Release for mechanics, Changesets for the contributor ritual.**
  Caret ranges within the family — no exact cross-package pins until release
  automation is proven.

⚠️ **See the open question on entry-point granularity below before committing.**

---

## APPROVED REACTIVE MODEL

Signals canonical (`signal`, `computed`, `linkedSignal`). `effect()` only for
edge side effects — focus, DOM writes, announcements. `toObservable` at the
boundary, created lazily. Consumer Observables converted once with `toSignal`.
`resource`/`httpResource` preferred where they fit.

**One trap to audit for:** a library component that instantiates _consumer_
components via `ViewContainerRef` cannot safely be OnPush, because that breaks
refresh for `Eager` children. `<ng-content>` projection is safe. Applies to
dialog content, table cell components and overlay content specifically.

---

## APPROVED CSS / THEME MODEL

- **`@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;`**
  emitted as the first statement of the global sheet, wrapping all TEKAD CSS.
  Unlayered consumer rules then beat layered library rules regardless of
  specificity — no `!important`, no `::ng-deep`. Declare the order once in the
  global sheet; Angular's component-CSS injection order is not author-controllable.
- **`:where()`** for resets and structural defaults (zero specificity).
- **Three token tiers, one emitted:** primitive `--_tekad-ref-*` (build-time
  only, never in `:root`); semantic `--tekad-sys-*` (the public, semver-stable
  contract, the only tier in the global sheet, colours always in `on-`/container
  **pairs**); component `--tekad-button-*` (defaults declared inside the
  component's own CSS, zero `:root` cost).
- **Dark mode:** `color-scheme` is the single source of truth. Attribute
  (`[data-tekad-scheme]`) is the control surface; **`light-dark()` does the
  work**, so a dark island is one attribute and nothing else. ⚠️ `light-dark()`
  (88.8%) is newer than Angular v22's own browser floor — ship the
  `@supports not (color: light-dark(#000,#fff))` fallback.
- **Author in logical properties only** (96.4%) — RTL costs zero extra CSS.
- **SCSS is an internal authoring tool.** Never a consumer requirement — that
  would kill runtime theming, exclude CDN consumers, and make every mixin
  semver surface.
- **No Shadow DOM in v1** — ARIA IDREF attributes cannot cross a shadow
  boundary, which breaks every composite widget spanning components.
- **The governing rule:** never let a variant axis (theme, scheme, density,
  brand, direction) become a selector. That is the mechanism behind
  Material's 7.4 KB M3 theme versus ~108 KB for the M2 per-component approach.

**Forced colors is a release gate.** `box-shadow` and `background-image` are
forced off and colours are mapped by **element semantics, not ARIA role** — so
`<div role="button">` gets `CanvasText`, not `ButtonText`. Build on native
`<button>`/`<input>`. Every focus ring and elevation needs a
`@media (forced-colors: active)` substitute. Every component ships a
forced-colors snapshot.

**Contrast is a build-time assertion, not a hope.** OKLCH `L` is _not_ WCAG
relative luminance. Generate tones in OKLCH, then compute WCAG contrast for
every declared semantic pair in both schemes and **fail the build** below
4.5:1 (body) / 3:1 (non-text). Consumer brand seeds run the same pipeline.
Conform to **WCAG 2.2 AA**; APCA is diagnostics only and never gates CI.

---

## APPROVED ACCESSIBILITY MODEL

**Adopt `@angular/aria` for the Pattern layer.** Stable in v22, MIT, headless,
ships zero CSS, 12 patterns across 9 runtime entry points, test harnesses
included, ~10–35 KB raw per pattern. Reimplementing roving tabindex,
`aria-activedescendant`, typeahead or list navigation is the textbook NEVER
BUILD case.

- **`@angular/aria` peer-pins `@angular/cdk` at an exact version.** "Aria
  instead of CDK" is not available; declare both as peers.
- **Never build on `@angular/aria/private`.**
- **It positions nothing.** No dialog, tooltip, popover, focus trap, live
  announcer or backdrop. TEKAD owns the entire floating layer.
- Aria supplies correct behaviour; **TEKAD is still accountable for
  accessibility in composition.** Keyboard, focus-restoration and ARIA
  state-transition tests are per-component acceptance criteria — never a
  roadmap milestone. (NG-ZORRO's a11y tracking issue has been open since 2018.)

---

## APPROVED OVERLAY MODEL

**Hybrid, TEKAD-owned.** Not `@angular/cdk/overlay`: it costs **24.3 KB gzip
and does not tree-shake** (the minimal factory import is 98% of the full
barrel), it dictates DOM/CSS/`@layer` structure, and its focus trap is
pre-`inert` sentinel-based with `aria-hidden` sibling juggling.

- **Top layer:** `popover` (91.5%) for non-modal; **`<dialog>.showModal()`**
  (96.1%) for modal dialog and drawer — it grants `inert`, `aria-modal`,
  Escape and focus restore for free. Feature-detect, with a
  `position: fixed` + `@layer` z-index fallback.
- **`popover="auto"`** where native stack semantics are wanted; `"manual"` plus
  TEKAD's dispatcher for nested portalled submenus and tooltips.
  **Never `popover="hint"`** — Safari has zero support.
- **`inert` (94.7%)** for any non-`<dialog>` modal surface. `aria-modal` is the
  annotation; `inert` is the enforcement. Never the reverse.
- **Positioning: Floating UI** (`@floating-ui/dom`, MIT, **6.4 KB gzip** for
  the needed subset) as the always-correct baseline — CSS anchor positioning
  has no JS-observable output and no `size` equivalent, both mandatory for
  select, combobox and menu. Layer anchor positioning behind
  `@supports (anchor-name: --x)` for tooltip and popover only.
- **Public placement API is logical** (`block-start`, `inline-end`), mapping
  down to whichever engine is active.

**Budget: under 10 KB gzip** for overlay foundation + positioning, against the
measured 24 KB CDK baseline.

---

## APPROVED FORMS MODEL

**Signal Forms is the native integration.** Every TEKAD control implements
`FormValueControl` (a `value` model signal, no `checked`) or
`FormCheckboxControl` (a `checked`, no `value`), plus a `touch` output on blur.
Validation lives in the schema, not the control.

⚠️ **Angular explicitly forbids implementing both `ControlValueAccessor` and
`FormValueControl` on the same component.** Reactive-Forms support therefore
ships as a **separate thin CVA adapter** in its own entry point
(`@tekad/forms/compat`) — never dual-implemented. Document Angular's
`SignalFormControl` / `compatForm` bridges as the alternative route.

The compat adapter must be in the first vertical slice: "works with Reactive
Forms" is a hard enterprise adoption requirement.

---

## APPROVED TABLE MODEL

**Four strictly one-directional layers**: L0 row model (zero DOM) → L1 column
model (zero DOM) → L2 interaction & a11y (wraps `@angular/aria` Grid) → L3
rendering (the only DOM layer).

**TEKAD owns L3.** Not `@angular/cdk/table`, for three measured reasons: it has
**zero signal APIs in v22**; its portal rendering **structurally breaks
`@angular/aria`'s `ngGridCell`** (NG0201, angular/components#32603); and its
`StickyStyler` conflicts with a transform-based virtual viewport. Keep
`@angular/cdk/overlay`-equivalent behaviour only for edit popovers and column
menus. Owning L3 costs ~2,000 lines.

**Virtualization: `@tanstack/virtual-core`** (6.7 KB gzip, MIT, dynamic
measurement, both axes) — `@angular/cdk/scrolling` ships **fixed-size only** in
stable and its autosize strategy has been stuck in `cdk-experimental` since 2024. Wrap it in a TEKAD signal adapter.

**Required day one: `rowId: (row, index) => string`** — it feeds `@for` `track`,
selection, expansion, edit buffers and `aria-rowindex` simultaneously.

**Role rule:** native `<table>` for read-only non-virtualized; `role="table"` +
`aria-rowcount`/`aria-rowindex` when virtualized but non-interactive;
`role="grid"` **only** when 2-D roving-tabindex navigation is actually
implemented. `role="grid"` without the keyboard model is worse than no role.

**Gaps to fill over `@angular/aria` Grid:** PageUp/PageDown, F2,
`aria-rowcount`/`aria-colcount`, `aria-sort` + a polite live region.

**DOM order must equal visual order** — no node pooling, or screen-reader
navigation breaks even with correct `aria-rowindex`.

---

## APPROVED DEPENDENCIES

| Package                         | Classification                  |
| ------------------------------- | ------------------------------- |
| `@angular/core`, `/common`      | peer                            |
| `@angular/cdk`, `@angular/aria` | peer                            |
| `rxjs` (Apache-2.0)             | peer                            |
| `@angular/forms`                | optional peer                   |
| `tslib` (0BSD)                  | **runtime dependency**          |
| `@floating-ui/dom` (MIT)        | **runtime dependency**          |
| `@tanstack/virtual-core` (MIT)  | runtime dependency (table only) |
| ng-packagr, TypeScript, Vitest  | dev                             |

## OPTIONAL DEPENDENCIES

`chart.js` (MIT), `d3` (ISC), `date-fns` (MIT), `luxon` (MIT),
`@internationalized/date` (Apache-2.0) — all **optional peers**
(`peerDependenciesMeta: {optional: true}`) behind thin adapters.

## FORBIDDEN

Any charting library reachable from a core package (CI gate). Any copyleft
dependency. Any package with a lifecycle script in TEKAD's own published
output. `@angular/aria/private`. Taiga UI as a dependency (its CI pins Angular
19; v22 is unverified).

**Audit rule:** the npm `license` **field** is a screening signal, not
evidence. PrimeNG's field went opaque at v18 — four majors before the
substantive commercial change at v22. The CI licence gate must read the
LICENSE file.

---

## PERFORMANCE BUDGETS

Committed now (measured baselines exist):

- Overlay foundation + positioning: **< 10 KB gzip** (CDK baseline 24.3 KB).
- Theme sheet: **~2 KB gzip** (~9 KB raw), plus ~1 KB for the `light-dark()`
  fallback until it can be dropped.
- Component CSS: 1.5–4 KB raw each, emitted once, code-split.

Set from baselines at Phase 8: package size per entry point, incremental app
impact, first render, update time, DOM nodes per instance, reactive
recomputation, SSR render + hydration cost.

Table targets to validate by prototype: ≤60 rows in DOM regardless of dataset;
60 FPS scroll at ≤8 ms scripting/frame; first paint of 30×10 < 50 ms;
100k-row sort < 400 ms.

**No credible public benchmark for large Angular tables exists.** Publish
TEKAD's own; cite none of the vendor-authored ones.

---

## MVP — the Phase 9 vertical slice

Button · Icon · Input · Form Field · Label · Checkbox · Switch · Dialog ·
Select · Table foundation · the CVA compat adapter.

Its purpose is to **prove the architecture** — packaging, tokens, signals,
Signal Forms + Reactive Forms, accessibility, testing, docs, tree-shaking,
SSR — not to fill a catalogue. If any of those hurts here, fix the foundation
before adding components.

## DEFERRED

Variable row heights, column virtualization, grouping/aggregation, editable
cells, cell-range selection, tree/master-detail, column drag-reorder, charts,
Shadow DOM, a copy-in styled layer, SBOM, LTS commitment, component-generation
schematics, migration schematics (but wire `ng-update` plumbing at launch).

## NEVER BUILD

A chart engine. A rich-text engine. A third forms framework. Any WAI-ARIA
pattern `@angular/aria` already ships. A generic `BaseComponent`,
`UniversalState` or `@tekad/utils` dumping ground.

---

## LEGAL / IP WARNINGS

**Nothing may be published until the following are resolved.**

1. **Trademark: REQUIRES PROFESSIONAL SEARCH.** Every official register — IP
   India, USPTO, EUIPO/TMview, WIPO — was inaccessible to automated research.
   Two unofficial US mirrors showed no exact TEKAD mark (weak, US-only).
   **India and Indonesia/Malaysia were not searched at all**, and TEKAD is a
   common Indonesian/Malay word ("determination") with at least six existing
   corporate users, an active Indonesian government programme running public
   web software under the name, and **TEKADA** — a Batam software company one
   letter away.
2. **`github.com/tekad` exists** as a dormant, empty user account. `tekad-ui`
   and `tekadui` are free.
3. **npm `@tekad` shows no published packages, but scope _reservation_ is not
   publicly detectable.** Run `npm org ls tekad` authenticated, or attempt a
   throwaway publish, before committing. The same person may hold both the
   GitHub account and the npm scope.
4. **Register the scope and squat-protection placeholders (`tekad`,
   `tekad-ui`, `ngx-tekad`) before announcing the name publicly.**
5. `tekad.dev`, `tekad.io`, `tekadui.dev` show no A record; `.com`, `.org`,
   `.id`, `.co.id` resolve to live hosts. RDAP was blocked — not authoritative.
6. A full attorney question list is in `docs/research/15-trademark-brand-research.md`.

> Based on the sources reviewed, these risks appear lower/higher, but formal
> trademark and IP clearance should be obtained from a qualified attorney
> before commercial launch or registration.

---

## OPEN QUESTIONS

1. **⚠️ Entry-point granularity vs IDE auto-import.** `angular/angular#40407`
   — "VS Code auto-import doesn't identify secondary entry points" — is a
   long-standing **open** issue, in direct tension with the many-entry-point
   topology. If a developer pastes `<tekad-button>` and the IDE cannot offer
   the import, the first five minutes are lost. **Verify whether #40407 is
   fixed in the v21/v22 language service, test WebStorm separately, and
   measure the real tree-shaking delta with the CI probe before committing.**
   Treat ADR-004's granularity as provisional until then.
2. Does `@nx/angular@23.1.1` avoid the deprecated `@angular-devkit/build-angular`
   path on v22? It is still an optional peer. **Spike before scaffolding.**
3. Can per-entry-point FESM + shared-chunk splitting be achieved without
   Material's Bazel pipeline, and what is it worth in measured bytes?
4. `@angular/aria`'s exact CDK peer pin versus TEKAD's `^22 || ^23` range —
   what does that do to consumer installs in practice?
5. Screen-reader behaviour of `<dialog>.showModal()` — unverified from primary
   sources, and the whole modal strategy rests on it.
6. Whether component tokens earn their permanent API surface, or semantic
   tokens suffice.

---

## FIRST IMPLEMENTATION TASK

**Before any scaffold, run the go/no-go prototype.**

**P0 — CSS `overlay` property gap.** Build one popover and one modal using
`@starting-style` + `transition-behavior: allow-discrete`, and observe the
exit transition in **Firefox and Safari**, which do not support the CSS
`overlay` property (73.5% global). Without it, a closing overlay is demoted
from the top layer on the first frame of its exit animation and can be clipped
or painted under ancestor stacking contexts. Decide now between opacity-only
exits, JS-deferred `hidePopover()`, or no exit animation.

**P1 — `@angular/aria` Grid under `@for` rendering.** Prove `ngGridCell`
registers correctly outside portals and that #32603's DI failure does not
recur. If this fails, the entire L2 table strategy collapses and TEKAD owns
the keyboard model — a 5× cost change.

**Then, and only then:** Phase 1 — Nx + pnpm workspace, git init, lint,
format, typecheck, and the dependency-boundary rules wired from day one
(retrofitting boundaries after packages exist is painful).

Do not scaffold before P0 and P1 have answers.
