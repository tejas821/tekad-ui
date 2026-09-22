# Accessibility Strategy — build on @angular/aria, own the floating layer

Research date 2026-08-26. Sources: angular.dev Aria guides, published
`@angular/aria` and `@angular/cdk` tarballs, WAI-ARIA APG.

## What `@angular/aria` actually is

- MIT, published from the `angular/components` monorepo, stable in v22
  (developer preview in v21).
- **Headless and behaviour-only. Ships zero CSS** — the tarball contains only
  `LICENSE`, `README.md`, `package.json`, `fesm2022/`, `types/`.
- `"sideEffects": false`.
- **9 runtime entry points**: root, `accordion`, `combobox`, `grid`, `listbox`,
  `menu`, `tabs`, `toolbar`, `tree` — plus `./private` and 8 `*/testing`.
- **12 documented patterns**: the 8 above plus Autocomplete, Select,
  Multiselect and Menubar, which are documented _compositions_ over the same
  primitives, not separate modules.
- Directives set `aria-expanded`, `aria-selected`, `aria-disabled`,
  `aria-pressed`, `aria-checked`, `aria-current`, `aria-activedescendant` and
  roving `tabindex`. Consumers style off those attributes.
- Rich behavioural inputs — e.g. listbox exposes `orientation`, `multi`,
  `wrap`, `softDisabled`, **`focusMode: 'roving' | 'activedescendant'`**,
  `selectionMode: 'follow' | 'explicit'`, `typeaheadDelay`, and a `value`
  model signal.
- **Test harnesses ship per pattern**, extending CDK's `ComponentHarness`.
- Measured: 10–35 KB raw per pattern entry point; menu+listbox+combobox
  together ≈ 23 KB gzip.

## The two facts that constrain the decision

1. **`@angular/aria` peer-depends on `@angular/cdk` at an exact pinned
   version.** "Aria instead of CDK" is not an available choice. TEKAD's own
   peer range must accommodate this, and CDK patch releases move the pin.
2. **It positions nothing.** A grep of every published bundle for
   `position|getBoundingClientRect|showPopover|z-index|anchor-name|overlay`
   returns exactly one hit — a `compareDocumentPosition` call for DOM-order
   sorting in a dev-mode check. No geometry, no top layer, anywhere.

## Explicit gaps — what TEKAD must own

Dialog / modal / alertdialog (no directive, no focus trap), tooltip, popover,
date picker / calendar, **all overlay positioning**, focus trap, live-region
announcer, scroll blocking, backdrop. Also absent: slider, switch, standalone
radiogroup, checkbox, data table (Grid ≠ CdkTable), carousel, breadcrumb,
pagination, toast, progress/meter, rating, tree-grid, splitter.

Aria covers roughly the "list / tree / tab / menu keyboard model" half of a UI
library and **none** of the floating-layer half.

## CDK's position in v22

Not deprecated in favour of Aria. No `@deprecated` markers on
`cdk/listbox`, `cdk/menu`, `cdk/accordion`, `cdk/tree`. CDK uniquely owns
`overlay`, `portal`, `dialog`, `drag-drop`, `scrolling` (virtual scroll),
`table`, `layout`, `platform`, `clipboard`, `observers`, `text-field`,
`collections`, `coercion`, `keycodes`, `bidi`, `stepper`, `testing`, and the
whole of `a11y` (`FocusTrap`, `FocusMonitor`, `LiveAnnouncer`,
`InteractivityChecker`, `AriaDescriber`, `InputModalityDetector`,
`HighContrastModeDetector`, `_IdGenerator`, key managers).

Notably, `@angular/material@22.1.4` imports from `@angular/aria` **zero
times** — three generations coexist in one repo.

**Division of responsibility:** CDK = infrastructure + low-level a11y
utilities; Aria = signal-era headless WAI-ARIA _patterns_ built on those
utilities. Overlap is narrow (list/menu/tree/accordion), where CDK's older
decorator versions are retained for compatibility. New work belongs on Aria.

## Recommendation

**Adopt `@angular/aria` for the Pattern layer.** Declare it and
`@angular/cdk` as peer dependencies. Do not build TEKAD's own roving-tabindex,
`aria-activedescendant`, typeahead or list-navigation engines — that is exactly
the NEVER BUILD case, and Angular maintains it on the framework's cadence.

**Do not build on `@angular/aria/private`.** It is explicitly private and
carries no compatibility guarantee.

**Own the floating layer entirely** — dialog, drawer, tooltip, popover,
positioning, focus trapping, dismissal. See the overlay strategy document.

**Own accessibility verification.** Aria supplies correct behaviour; TEKAD is
still accountable for it in composition. Keyboard, focus-restoration and ARIA
state-transition tests are per-component acceptance criteria, not a milestone.

## Anti-pattern, evidenced

NG-ZORRO's accessibility tracking issue #1651 has been open since June 2018,
still labelled `help wanted`. A11y deferred to a milestone stays deferred.
