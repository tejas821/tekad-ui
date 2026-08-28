# TEKAD Architecture Overview

Status: foundational. Amend via ADR.

## 1. Compositional hierarchy

```
Foundation      tokens, theme, build/test infrastructure
    |
Primitive       headless behaviour: focus, keyboard, ids, dismiss, dir
    |
Pattern         composed behaviour: listbox, menu, combobox, dialog, grid
    |
Component       ready-to-use, styled, accessible, typed
    |
Enterprise      data grid, scheduler, command palette, wizard
```

This is a **compositional** hierarchy, not a mandate for four packages per
feature. Implement a feature at the lowest level that is sufficient.

Dependencies flow **downward only**. A Pattern may depend on a Primitive.
A Primitive must never depend on a Component. Optional integrations
(e.g. charts) must never be depended on by core.

## 2. Two consumption models, one source of truth

```
                 CANONICAL SIGNAL STATE
                          |
            +-------------+-------------+
            |                           |
     signal consumption          rxjs adapter
     (computed, inputs,          (toObservable at the
      linkedSignal)               public boundary only)
            |                           |
            +-------------+-------------+
                          |
                     PUBLIC API
```

Forbidden: duplicate stores, mirrored `BehaviorSubject`s, `effect()` used to
copy one reactive value into another, signal↔observable round-tripping.

RxJS remains first-class where it is genuinely the right abstraction:
async composition, cancellation, event pipelines, HTTP, server-driven data.

See ADR-002, ADR-003.

## 3. Consumer tiers

| Tier | Needs | TEKAD answer |
|---|---|---|
| Beginner | install → import → use | Component layer, sensible defaults |
| Advanced | control the markup | Pattern layer + content projection |
| Expert | control the behaviour | Primitive/headless layer |

A developer must **never** have to assemble primitives to render a standard
button, input, dialog or table.

## 4. Platform baseline (verified 2026-08-26)

| Item | Value | Source |
|---|---|---|
| Angular | v22.0.x | angular.dev/reference/versions |
| Node | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` | angular.dev/reference/versions |
| TypeScript | `>=6.0.0 <6.1.0` | angular.dev/reference/versions |
| RxJS | `^6.5.3 \|\| ^7.4.0` | angular.dev/reference/versions |

Angular v22 facts that shape TEKAD:

- `OnPush` is the **default** change detection strategy for new components;
  the old default is renamed `ChangeDetectionStrategy.Eager`.
- **Signal Forms are stable** — the forms integration story is signal-native.
- **`@angular/aria` graduated to production**: 13 headless, behaviour-only
  WAI-ARIA pattern directives (autocomplete, listbox, select, multiselect,
  combobox, menu, menubar, toolbar, accordion, tabs, tree, grid) with test
  harnesses. This materially changes TEKAD's build-vs-reuse calculus for the
  Pattern layer. See ADR-005.
- Webpack-based builders and `@ngtools/webpack` are deprecated.

## 5. SSR / hydration invariants

- No module-level access to `window`, `document`, `localStorage`,
  `matchMedia`, `ResizeObserver`, `IntersectionObserver`.
- IDs come from a deterministic, injectable generator — never `Math.random()`
  or a timestamp — so server and client markup match.
- Measurement-dependent behaviour (positioning, virtualization) must render a
  stable, non-measured first paint and refine after hydration.
- Browser-only work is isolated behind an injection boundary that is trivially
  no-op on the server.

## 6. What TEKAD deliberately does not own

Chart engines, rich-text engines, date/time arithmetic beyond what the
platform provides, icon *content* at scale, and any behaviour Angular itself
already ships well. See ADR-008 and `03-dependency-policy.md`.
