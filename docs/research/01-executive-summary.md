# Executive Summary — TEKAD Research (interim)

Research date 2026-08-26/27. **Status: COMPLETE.** All nine areas researched.
Decisions are distilled into `IMPLEMENTATION_HANDOFF.md` at the repository
root — read that to implement; read this for the reasoning.

## 1. Should TEKAD proceed?

**Yes — and the market moved in its favour during this research.**

PrimeNG v22 left open source. The `LICENSE.md` in the published
`primeng@22.1.0` tarball is a commercial "PrimeUI" licence requiring a
**licence key**, with a free tier gated on revenue, headcount and funding, and
a paid tier at $599/developer. v21 and earlier remain MIT; the public repo is
frozen at 21.1.9 and the v22 tag 404s. An MIT fork (`@openng/optimus-ui`)
appeared within three weeks and reached Angular 22 parity.

The largest batteries-included Angular UI library is now commercial, and the
ecosystem reacted defensively. A genuinely open, permissively licensed,
enterprise-grade Angular UI ecosystem is an under-served position.

This raises TEKAD's own bar: an explicit public commitment not to relicense
the core is now a differentiator, and governance choices that make relicensing
possible — notably a CLA with copyright assignment — will be read as risk.

## 2. What should TEKAD build first?

Foundations, then one vertical slice that proves the architecture end to end —
packaging, tokens, signals, forms, accessibility, testing, docs, tree-shaking
and SSR. Not a component catalogue.

## 3. What should TEKAD explicitly NOT build?

- **Any WAI-ARIA pattern `@angular/aria` already ships.** It is stable in v22,
  MIT, headless, behaviour-only, ships zero CSS, and covers 12 patterns with
  test harnesses. Reimplementing roving tabindex, `aria-activedescendant`,
  typeahead and list navigation is the textbook NEVER BUILD case.
- **A chart engine.** Optional packages or recipes only.
- **A third forms framework.**
- **A positioning engine from scratch** — Floating UI is 6.4 KB gzip for the
  needed subset and solves problems CSS anchor positioning cannot.

## 4. Architecture

Primitive → Pattern → Component → Enterprise, dependencies downward only.
Signals canonical; RxJS as a boundary adapter. Standalone-first, Angular
22-only. Behaviour core / thin directive split. `hostDirectives` composition.
A `[data-*]` state contract as public API.

## 5. Package topology

Capability packages with **two-level, category-prefixed** secondary entry
points (`@tekad/core/components/button`). ng-packagr generates the exports map
and emits no wildcard subpath, so internal paths are unimportable by default —
assert it in CI. Aim for Material's per-entry-point FESM + shared-chunk
splitting, but note stock ng-packagr does not produce it.

**Tooling:** Nx 23.1 + pnpm, with two conditions — accept a 4–8 week lag on
each Angular major, and do not depend on Nx remote caching (deprecated,
commercially licensed, withdrawn over CVE-2025-36852, whose threat model is
precisely an OSS repo taking fork PRs). pnpm is non-negotiable: it turns
phantom dependencies into an install-time error.

## 6. Reactive model

Signals canonical. `toObservable` at the public boundary only. `effect()` for
edge side effects only. Watch the one documented trap: a library component
that instantiates **consumer** components via `ViewContainerRef` cannot safely
be OnPush. `<ng-content>` projection is safe.

## 7. What should use Angular's packages

`@angular/aria` for the Pattern layer; `@angular/cdk` for infrastructure —
though note **Aria peer-pins CDK at an exact version**, so "Aria instead of
CDK" is not an available choice.

## 8. What stays custom

The entire floating layer. `@angular/aria` positions nothing — a grep of every
published bundle for positioning APIs returns one incidental hit. It provides
no dialog, tooltip, popover, focus trap, live announcer or backdrop.
`@angular/cdk/overlay` costs ~24 KB gzip and **does not tree-shake** (the
minimal import is 98% of the full barrel), and its focus trap is pre-`inert`.

TEKAD builds a hybrid overlay on `popover` (91.5%), `<dialog>.showModal()`
(96.1%), `inert` (94.7%) and Floating UI, with CSS anchor positioning as a
progressive enhancement.

## 9. Forms

Signal Forms are stable and are TEKAD's native integration
(`FormValueControl`). Angular explicitly forbids implementing both
`ControlValueAccessor` and `FormValueControl` on one component, so Reactive
Forms support ships as a **separate thin CVA adapter entry point**.

## 10. Performance budgets

Overlay foundation + positioning: **under 10 KB gzip**, measured against the
24 KB CDK baseline. Other budgets are set from measured baselines at Phase 8 —
inventing numbers now would be speculation.

## 11. Legal / IP

**Apache-2.0 + DCO, no CLA** (ADR-015). Apache-2.0's §6 withholds the *name*
at licence level — a fork gets the code but not the right to call itself
TEKAD — and §3's patent grant is something MIT has no equivalent for. Adoption
cost is near zero: `rxjs`, a mandatory Angular peer, is already Apache-2.0.
DCO leaves copyright with contributors, which removes the legal capacity to
relicense unilaterally — the structural anti-PrimeNG signal.

**No dependency in the matrix is copyleft; none is forbidden.**

**Trademark: REQUIRES PROFESSIONAL SEARCH.** No official register was
reachable; India and Indonesia/Malaysia were not searched at all; TEKAD is a
common Indonesian/Malay word with several existing corporate users.
`github.com/tekad` exists as a dormant account. **Nothing may be published
until ADR-016's gates pass.**

## 12. Major technical risks

1. **CSS `overlay` property is unsupported in Firefox and Safari (73.5%
   global).** A closing overlay is demoted from the top layer on the first
   frame of its exit transition. **This is the go/no-go prototype.**
2. `showModal()` force-closes `auto` popovers — sequencing constraint.
3. `@angular/aria`'s exact CDK peer pin versus TEKAD's `^22 || ^23` range.
4. Nx's lag behind Angular majors.
5. Per-entry-point chunking is not free from ng-packagr.
6. Screen-reader behaviour of `<dialog>.showModal()` is unverified — the modal
   strategy rests on it.

## 13. Expensive to change later

Package topology and entry-point naming; the npm namespace; the `[data-*]`
state contract; token names; the forms integration choice; the licence.

## 14. Reversible

Monorepo tool (published output is identical either way); docs stack; test
runner; which components ship first.

## What now gates implementation

Not research — two prototypes:

- **P0** — CSS `overlay` exit-animation behaviour in Firefox and Safari.
  GO/NO-GO for the overlay design.
- **P1** — `@angular/aria` `ngGridCell` under `@for` rendering
  (angular/components#32603). Gates the table architecture.

Plus two parallel verifications: `angular/angular#40407` (auto-import vs
secondary entry points) and the Nx/`@angular-devkit/build-angular` spike.
