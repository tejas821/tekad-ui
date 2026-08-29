# Current task — Phase 9: the first vertical slice

Phases 0–8 are complete. Phase 8's record is
`docs/architecture/14-testing-infrastructure.md`; the phase-by-phase state is in
`.ai/state.json`.

## What Phase 9 is

The first real component, built end to end: pattern behaviour, styling from the
Phase 4 tokens, accessibility verified behaviourally, SSR, tests, budgets, and a
docs example. Everything before this built foundations and proved them; this is
the first thing a consumer would actually import.

## What earlier phases owe it

**From ADR-013 / Phase 7 — the CVA adapter.** `@tekad/forms/compat`, built
against the slice's real controls rather than designed against nothing. ADR-013
is explicit that it is public API: its own tests, SSR obligations and
accessibility obligations, plus a tree-shaking scenario proving it does not
reach a consumer who only uses signal forms.

A control must never implement both forms contracts.
`tools/verify-forms-contracts.mjs` is the only thing that catches it — Angular
does not. Measured in 22.1.4: it accepts the component, silently prefers the
`ControlValueAccessor`, and the signal-forms value model never binds.

**From ADR-011 / Phase 8 — the four budgets that needed something to measure.**

- `size-limit` 13.x with `@size-limit/esbuild`, per-entry budgets and PR
  comments. `source-map-explorer` and `bundlesize` are unmaintained and must
  never be CI gates.
- Forced-colors visual snapshots per component, both system themes.
- An SSR/hydration test per package.
- `axe` on every example.

**From Phase 2 — a tree-shaking scenario per hazard.** The probe covers the
current graph only. Every new DI token evaluated at import time, module-level
side effect, or `providedIn: 'root'` service needs its own scenario, with a
positive control.

**From Phase 6 — the three things the overlay deliberately does not have.**
Floating UI positioning (6.4 KB gzip against ADR-010's 10 KB budget), the
dismissal dispatcher, and a focus trap. Each waits for a call site. The focus
trap is narrower than ADR-010 implies: `showModal()` already grants `inert`,
`aria-modal`, Escape and focus restore at 96.1%, and a non-modal popover should
not trap focus at all — so a bespoke trap is needed only on the `position:
fixed` fallback path, and that should be confirmed against a real fallback
first.

**From Spike B — a TEKAD secondary-entry-point generator.** The stock
`@nx/angular` one emits a flat, one-level entry point containing an NgModule:
wrong on both counts.

**From ADR-012 — the packed-tarball import probe.** The fourth boundary layer,
and the only check that sees what a consumer actually receives.

## How tests are expected to be written here

Phase 8 established the shape, and the reason is worth restating: the
live-announcer suite went green while nine of its eleven tests were indifferent
to the behaviour they existed to protect.

- Assert **behaviour**, not end state, wherever the two differ. `TekadButton`'s
  `type` default is not checked as an attribute — the button is put in a
  `<form>`, clicked, and the form required not to submit, with a companion test
  proving the environment *does* implement implicit submission.
- Logic, ordering and DOM structure in jsdom via `nx test`. Top layer, focus,
  `inert`, animation, media queries and computed style in a real browser — jsdom
  has none of them.
- Every new piece of load-bearing behaviour gets **a mutant in
  `tools/mutants.json`**. That is how the suite is shown to be load-bearing
  rather than merely green. Removing a mutant because it fails is how the gate
  stops meaning anything; fix the test instead.
- Accessibility is verified behaviourally, never by attribute-counting
  (CLAUDE.md Definition of Done).

## Publish gate — independent of all the above

Nothing is published until ADR-016's gates pass: npm scope availability,
placeholder registration **before the name is announced publicly**, and
professional trademark clearance for India, Indonesia and Malaysia. `LICENSE`
stays uncommitted and every package keeps `private: true` until then.

## Local setup still owed

`node_modules` was never written over the device bridge. Run `corepack enable
pnpm && pnpm install` in the repo; the lockfile is committed and CI installs
frozen. `_to_delete/` can be removed by hand — the bridge cannot unlink files.

## Tracked, not blocking

Firefox/Gecko and real Safari for P0 and P1; **screen-reader validation, which
nothing in this project has ever done**; `prefers-reduced-motion` in WebKit —
now known to be unreachable in the unit runner too, since jsdom has no
`matchMedia`; synchronous `toggle` delivery; and the Angular Language Service
template path (Spike A Q2).
