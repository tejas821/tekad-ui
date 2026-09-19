# ADR-007 — Styling & design-token architecture

**Status:** Accepted · **Date:** 2026-08-27 (was Proposed 2026-08-26)
**Evidence:** `docs/research/07-css-theme-design-token-strategy.md`

## Context

Theming architecture determines CSS size, specificity pain, dark-mode cost,
branding effort and SSR safety, and is expensive to change late.

## Decision

1. **Cascade layers.** All TEKAD CSS lives inside
   `@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;`,
   declared once as the first statement of the global sheet. Unlayered
   consumer rules then win regardless of specificity — no `!important`, no
   `::ng-deep`. (`@layer` 95.3%.) `:where()` for resets and structural defaults.
2. **Three token tiers, one emitted.** Primitive `--_tekad-ref-*` build-time
   only; semantic `--tekad-sys-*` the public semver-stable contract and the
   only tier in the global sheet, with colours always in `on-`/container
   **pairs**; component `--tekad-*-*` defaults declared inside each
   component's own CSS at zero `:root` cost.
3. **Dark mode:** `color-scheme` is the source of truth; `[data-tekad-scheme]`
   is the control surface; **`light-dark()` does the work**, so a dark island
   is one attribute. Ship the `@supports not (color: light-dark(#000,#fff))`
   fallback — `light-dark()` (88.8%) is newer than Angular v22's browser floor.
4. **Logical properties only** (96.4%) — RTL costs zero extra CSS.
5. **SCSS is an internal authoring tool**, never a consumer requirement.
6. **Contrast is a build-time assertion.** OKLCH `L` is not WCAG relative
   luminance; generate tones in OKLCH, then compute WCAG contrast for every
   semantic pair in both schemes and fail the build below 4.5:1 / 3:1.
   Consumer brand seeds run the same pipeline. Conform to WCAG 2.2 AA; APCA is
   diagnostics only.
7. **Forced colors is a release gate.** Colours map by element semantics, not
   ARIA role — build on native `<button>`/`<input>`. Every `box-shadow`-drawn
   focus ring or elevation needs a `@media (forced-colors: active)` substitute.
8. **No Shadow DOM in v1** — ARIA IDREF attributes cannot cross a shadow
   boundary, breaking every composite widget spanning components.
9. Publish `tokens.json` in **DTCG 2025.10** as metadata, never a runtime
   dependency.

**Governing rule:** never let a variant axis (theme, scheme, density, brand,
direction) become a selector. That is the mechanism behind Material's 7.4 KB
M3 theme versus ~108 KB for the M2 per-component approach.

## Alternatives

Per-component compiled theme CSS — rejected, size scales as a product rather
than a sum. Class-based dark mode — rejected, requires re-declaring the token
block under a descendant selector and nests badly. Relative colour syntax or
`contrast-color()` as the guarantee mechanism — rejected on support (91.1% /
79.7%) and because CSS cannot assert a contrast ratio.

## Consequences

Token names become public API with full compatibility obligations. Budget
~2 KB gzip for the theme sheet plus ~1 KB for the fallback. Emulated-
encapsulation SSR cost must be measured before Phase 9 (a 1,000-row table pays
one `_ngcontent` attribute per element).

## 2026-09-02 — obligation discharged: the SSR encapsulation cost is not where this ADR expected

**Every decision above stands.** The Consequences section closed with an
obligation — "Emulated-encapsulation SSR cost must be measured before Phase 9
(a 1,000-row table pays one `_ngcontent` attribute per element)" — and this is
that measurement. The parenthesis is correct. What it implies is not.

Measured on a 1,000 × 8 table (~9,000 elements), AOT-compiled in full mode and
rendered through `renderApplication`. `none` and `emulated` share a template,
styles and data, so the difference between them is the attribute cost alone.

| shape      | raw       | gzip    | brotli  | `_ngcontent` | `_nghost` |
| ---------- | --------- | ------- | ------- | ------------ | --------- |
| `none`     | 280.9 KB  | 22.1 KB | 8.1 KB  | 0            | 0         |
| `emulated` | 527.1 KB  | 21.0 KB | 9.0 KB  | 9,005        | 1         |
| `per-cell` | 1606.3 KB | 25.9 KB | 12.3 KB | 25,006       | 8,001     |

Overhead over `ViewEncapsulation.None`: `emulated` **raw +87.7%, gzip −4.8%,
brotli +10.8%**; `per-cell` **raw +471.9%, gzip +17.4%, brotli +51.0%**.

**Emulated encapsulation adds a quarter of a megabyte of raw HTML and, after
gzip, the document is smaller than the unencapsulated one.**
`_ngcontent-ng-c488987220=""` is the same 27 bytes on all 9,005 occurrences —
the easiest input a compressor will ever see. It lengthens the repeated unit
being back-referenced and pays for itself.

**The cost is the component instance, not the attribute.** `per-cell` differs
from `emulated` by one decision — a component per cell rather than one for the
table — and that is +51% brotli and 2.8× the elements. The two get conflated
because they usually arrive together; they are separable, and only one is
expensive.

**Parse cost was measured and says nothing.** In Chromium, `none` and
`emulated` are 2 ms apart against 202 ms of run-to-run noise; even `emulated`
versus `per-cell` does not separate. It stays UNVERIFIED, consistent with
ADR-011's rule that size is the hard gate and runtime performance is tracked
without blocking. An earlier run appeared to show emulated parsing _faster_;
that was noise, and it did not get written down only because the gate prints the
spread beside the median.

### Consequences

1. **TEKAD components use `ViewEncapsulation.Emulated`** — the default — and say
   nothing about it. The transfer cost was the entire case against it and it is
   not there. `None` would make every TEKAD class name a global name a consumer
   can collide with and TEKAD can never narrow, which is a permanent API
   commitment bought with a saving that does not survive compression.

2. **Decision 8's ShadowDom ban is now enforced**, by
   `tools/verify-ssr-encapsulation.mjs` against `packages/**`. It was enforced
   by nothing, which is the wrong number for a rule the entire ARIA IDREF model
   depends on: those attributes do not error across a shadow boundary, they
   resolve to nothing, and the widget renders looking correct and unlabelled.

3. **ADR-014 inherits a hard constraint: a table cell is not a component.** The
   table is the roadmap's flagship and its hardest architectural test, and this
   is the measurement that says where its size lever actually is.

Evidence: `apps/ssr-probe/`, `tools/verify-ssr-encapsulation.mjs`,
`docs/architecture/15-ssr-encapsulation.md`. The gate re-runs the whole
measurement on every CI build and holds both compressed overheads to budgets set
from the measured values. **If a future Angular changes the scoping scheme, it
fails** — and this correction should be revisited.
