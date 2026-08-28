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
