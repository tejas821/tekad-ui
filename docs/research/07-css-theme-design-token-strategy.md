# CSS, Theme & Design-Token Strategy

Research date 2026-08-26/27. Browser support verified against caniuse/MDN.

## Platform capabilities — verified

| Feature                     | Support                         | Global        |
| --------------------------- | ------------------------------- | ------------- |
| `@layer`                    | Chrome 99, FF 97, Safari 15.4   | **95.3%**     |
| Logical properties          | Chrome 89, FF 66, Safari 15     | **96.4%**     |
| `@property`                 | Chrome 85, FF 128, Safari 16.4  | 94.2%         |
| `:has()`                    | Chrome 105, FF 121, Safari 15.4 | 94.1%         |
| `oklch()`                   | Chrome 111, FF 113, Safari 15.4 | 93.3%         |
| `color-mix()`               | Chrome 111, FF 113, Safari 16.2 | 92.9%         |
| Relative colour syntax      | Chrome 131, FF 133, Safari 18   | 91.1%         |
| `light-dark()`              | Chrome 123, FF 120, Safari 17.5 | **88.8%**     |
| Container **style** queries | FF 151 full; others partial     | **1.7% full** |
| `contrast-color()`          | Chrome 147, FF 146, Safari 26   | 79.7%         |

## The three decisions that matter

### 1. `@layer` is the highest-leverage choice available

All normal declarations **outside** any layer beat all normal declarations
**inside** layers, regardless of specificity. So if every TEKAD rule lives in
`@layer tekad.*`, a consumer's plain `.my-btn { padding: 0 }` — specificity
(0,1,0) — beats a TEKAD rule at (0,4,2), with no `!important` and no
`::ng-deep`.

Emit as the first statement of the global sheet:

```css
@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;
```

Layer order is fixed by first appearance of the name, and Angular injects
component CSS in load order which authors cannot control — so the order must
be declared once in the global sheet, never inferred.

Pair with `:where()` (zero specificity, always) for resets and structural
defaults, so TEKAD's own reset never beats TEKAD's own component rule.

### 2. `light-dark()` + `color-scheme`, with a mandatory fallback

`light-dark()` resolves against the used value of `color-scheme`, and
`color-scheme` **inherits**. That makes a dark island trivial:

```html
<div data-tekad-scheme="dark">…</div>
```

sets `color-scheme: dark` and every token below flips — including inside
shadow roots — with **zero additional rules**. Class- and attribute-based
approaches require re-declaring the whole token block under a descendant
selector, and nested islands only work if declared on the element.

Composition: **the attribute is the control surface; `light-dark()` does the
work.**

⚠️ `light-dark()` became newly available May 2024, which is _newer than
Angular v22's own supported browser floor_ (Baseline widely available as of
2026-05-07, 30-month window). A fallback is required, not optional: emit the
light value as a plain declaration immediately before the `light-dark()` one,
plus one `@media (prefers-color-scheme: dark)` block behind
`@supports not (color: light-dark(#000,#fff))`. That block is the only
duplication in the theme and can be dropped on a documented schedule.

### 3. Never let a variant axis multiply against the component count

This is the mechanism behind Material's ~7.4 KB M3 theme vs ~108 KB M2 theme.

- **Old model:** per-theme _selector rules_ for every component. Size scales as
  components × declarations × themes × palettes × density — a **product**.
- **Token model:** per-theme _custom-property declarations_ on one `:root`
  rule; component rules emitted **once**, theme-independent, shipped with the
  component. Size becomes O(tokens) + O(components) — a **sum**.

Three multipliers collapse at once: theme count, light/dark (via
`light-dark()`), and density/palette permutations. Custom properties also gzip
extremely well, since the prefix repeats hundreds of times.

**Generalised rule: every variant axis — theme, scheme, density, direction,
brand — is expressed as a variable value, never as a selector.**

## Token architecture — three tiers, one emitted

- **Primitive** `--_tekad-ref-*` — tonal ramps per hue. **Build-time only,
  never emitted to `:root`.**
- **Semantic** `--tekad-sys-*` — the public, semver-stable contract.
  ~150–250 tokens: colour roles always in `on-`/container **pairs**, 6 spacing
  steps, 5 type roles, 4 radii, 3 elevations, 3 motion durations/easings.
  The only tier in the global sheet.
- **Component** `--tekad-button-*` — defaults declared **inside the
  component's own CSS**, resolving to a semantic token:
  `.tekad-button { --_bg: var(--tekad-button-bg, var(--tekad-sys-color-primary)); }`
  Zero `:root` cost, still fully overridable. Publish only tokens with a
  demonstrated need; everything else uses the private `--_tekad-` prefix and
  is documented as unstable. CI lint fails a public-prefixed token with no
  docs entry.

Publish `tokens.json` in **DTCG 2025.10** (the stable version — the July 2026
editor's draft says explicitly "do not implement anything in this document")
as a package export, generated by a pinned Style Dictionary. Metadata only,
never a runtime dependency.

## Colour and contrast

- OKLCH gives perceptually even ramps across hues where HSL does not.
- **But OKLCH `L` is not WCAG relative luminance.** Equal-L steps do not
  guarantee equal contrast, and two swatches at the same L with different
  chroma can straddle 4.5:1.
- `contrast-color()` is at 79.7% and far below Angular v22's floor — a future
  enhancement, not a guarantee mechanism.
- Relative colour syntax is unsuitable as the _shipping_ mechanism: gamut
  clipping makes ramps deviate unpredictably per hue, and CSS cannot assert a
  contrast ratio.

**The mechanism that works:** build-time generation of a fixed tone scale in
OKLCH; mandatory paired semantic tokens so consumers never choose foreground
and background independently; and a **build-time WCAG relative-luminance
assertion over every declared pair, in both schemes, that fails the build**
below 4.5:1 (body text) or 3:1 (non-text/large). The tone index is a starting
point; the assertion is the guarantee. Derived hover/pressed states via
`color-mix()` are checked too. A consumer's custom seed runs the same pipeline,
so a non-conforming brand colour is caught at their build.

TEKAD conforms to **WCAG 2.2 AA**. WCAG 3.0 is a Working Draft (03 March 2026)
with no defined contrast algorithm; APCA was removed from the WCAG 3 draft in 2023. APCA may be reported as supplementary diagnostics; it never gates CI and
never appears in a conformance claim.

## Forced colors — a release gate, not a polish pass

In forced-colors mode the UA overrides colours and forces `box-shadow: none`,
`text-shadow: none` and `background-image: none`, choosing system colours by
**element semantics — not by ARIA role**.

1. Never let `box-shadow` carry meaning alone — focus rings, elevation and
   selected states vanish. Each needs a `@media (forced-colors: active)`
   border/outline substitute.
2. Never let `background-color` alone denote state — switches, checkboxes,
   chips, progress bars, selected rows collapse to one colour. Use `border`,
   `outline`, `currentColor`, `Highlight`/`HighlightText` for selection,
   `GrayText` for disabled.
3. Icons as `background-image` disappear — use inline SVG with
   `fill: currentColor`, or `mask-image` (masks are not forced to none).
4. **Because mapping is by element semantics, `<div role="button">` gets
   `CanvasText`, not `ButtonText`.** Strong argument for building on native
   `<button>`/`<input>`.
5. `forced-color-adjust: none` only for literal colour swatches, never to
   restore a brand look.

Also: `prefers-reduced-motion: reduce` → durations ~0.01ms (not `none`, so
`transitionend` still fires); `prefers-contrast: more` → thicker borders, ramp
raised a step. Every component ships a forced-colors visual snapshot.

## Distribution

- **Component CSS ships with each component** (Angular bundles it with the
  component JS, so it code-splits and lazy-loads for free).
- **One tiny global sheet** holds the layer declaration, `@property`
  registrations and the `:root` token block.
- A prebuilt `tekad-all.css` may exist for CDN/no-bundler users, clearly
  labelled as the unoptimised path.
- **SCSS is an internal authoring tool only.** Requiring consumers to compile
  SCSS would make runtime theming impossible (per-tenant brands, user-selected
  accent, SSR-per-request), exclude CDN and non-bundler consumers, turn every
  mixin/function/map key into semver surface, and inherit Dart Sass churn.
- Author exclusively in **logical properties** (96.4%) — RTL then costs zero
  extra CSS.

## Rejected: Shadow DOM (v1)

Theming survives (custom properties inherit across the boundary) but:
**ARIA IDREF attributes cannot cross a shadow boundary** — `aria-labelledby`,
`aria-describedby`, `aria-controls`, `aria-activedescendant` — which breaks
every composite widget spanning components (combobox, listbox, tabs, form
field + error). `<label for>` does not associate across the boundary either,
and CDK-style overlays rendered to `<body>` escape shadow-scoped styles.
`@layer` + `:where()` + a token API deliver the override story shadow DOM
promises without the accessibility cost.

## Estimated CSS cost

Theme sheet ≈ 200 tokens × ~45 bytes ≈ **9 KB raw / ~2 KB gzip**, plus the
`@supports` dark fallback ≈ +6 KB raw / +1 KB gzip until it can be dropped.
Component CSS ≈ 1.5–4 KB raw each, emitted once, code-split with the
component. A six-component app ships roughly **3 KB theme + 15 KB component
CSS** — not a global bundle.

## Must be measured before committing

1. **Emulated encapsulation SSR cost** — a 1,000-row table pays one
   `_ngcontent-xxx` attribute per element in the SSR payload. Measure raw and
   Brotli HTML delta and hydration time, Emulated vs None. If material, switch
   to `ViewEncapsulation.None` + prefix discipline + `@layer`.
2. `@property` registration cost — recalc time at 0 / 20 / 250 registered
   properties on a 5,000-node tree.
3. `:has()` invalidation cost on the heaviest component before allowing it in
   shipped CSS.
4. Real theme-sheet size, two themes × light/dark, raw and gzipped.
5. The contrast matrix as a CI gate.
6. Forced-colors snapshots in both system themes.
7. The `light-dark()` `@supports not` fallback in a browser inside Angular
   v22's floor but below Safari 17.5 — no flash of wrong scheme.
