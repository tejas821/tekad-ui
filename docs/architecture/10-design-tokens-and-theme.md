# Design Tokens & Theme (Phase 4)

ADR-007, built and measured. `@tekad/theme` ships **1.01 KB gzipped** of CSS
carrying 16 colour tokens in two schemes, and every colour pair in it is
verified against WCAG 2.2 AA at build time, in both schemes, on every CI run.

## Three tiers, one shipped

| Tier      | Name                    | Where it lives                                                           |
| --------- | ----------------------- | ------------------------------------------------------------------------ |
| Primitive | `--_tekad-ref-*`        | **Nowhere.** Resolved inside `tools/build-tokens.mjs` and never emitted. |
| Semantic  | `--tekad-sys-*`         | The global sheet. The public, semver-stable contract.                    |
| Component | `--tekad-<component>-*` | Inside each component's own CSS, at zero `:root` cost.                   |

The primitive ramp is 5 families × 13 tones = 65 values. Emitting it would put
~2 KB of unused declarations in every consumer's `:root` so that a dozen
semantic tokens could reference them. So the ramp exists at build time and the
stylesheet contains only what a consumer can actually use.

The **governing rule** behind all of it: never let a variant axis — scheme,
density, brand, direction — become a selector. That is the difference between
Material's 7.4 KB M3 theme and ~108 KB for the M2 per-component approach.

- **Scheme** is `color-scheme` plus `light-dark()`: one declaration, two values.
- **Density** is one multiplier that components multiply their own spacing by,
  so changing it emits no CSS at all.
- **Direction** is free, because every value uses logical properties.

## Contrast is asserted, and the assertion is real

ADR-007 decision 6 turns on a distinction that is easy to state and easy to
forget: **OKLCH lightness is not WCAG relative luminance.** OKLCH is
perceptually uniform, which makes it right for _generating_ an even tone ramp.
WCAG contrast is defined on sRGB relative luminance, which is a different
quantity computed a different way.

`tools/lib/color.test.mjs` pins the gap with a measured case. Five hues at
**identical** OKLCH lightness (0.58) and **identical** chroma (0.12), all inside
the sRGB gamut:

| hue | colour    | contrast on white |               |
| --- | --------- | ----------------- | ------------- |
| 30  | `#b65c4e` | 4.536:1           | **passes AA** |
| 100 | `#8b7b02` | 4.258:1           | fails         |
| 145 | `#478d4b` | 4.054:1           | fails         |
| 250 | `#3c7ebe` | 4.268:1           | fails         |
| 320 | `#9961a6` | 4.550:1           | **passes AA** |

The AA threshold falls _inside_ the spread. Pick a lightness step, assume the
ratio follows, and you ship inaccessible colour while believing you proved
otherwise. (At low chroma the two spaces nearly agree — the spread at C=0.05 is
under 0.1 — which is what makes this trap easy to miss in a muted palette and
expensive to discover in a saturated one.)

So the ramp is **generated in OKLCH and asserted in sRGB**. All 12 declared
pairs currently clear AA in both schemes, the tightest being `outline` on
`surface` at 5.22:1 against a 3:1 requirement.

## Gamut fitting, because a clamped colour is an unchecked colour

A requested chroma is an intent, not a promise: sRGB cannot hold high chroma at
extreme lightness, and the achievable maximum varies sharply with hue — at
L=0.30, yellow runs out at ~0.063 chroma while blue reaches ~0.174.

The first build failed loudly here: 19 tones fell outside the gamut. The fix was
not a hand-tuned chroma table per hue, which would be wrong for the next hue
anyone adds. The generator **fits** each tone by reducing chroma until it fits,
holding lightness and hue — the two attributes carrying the design intent.

This matters for correctness, not tidiness. Silently clamping the encoded
channels produces a _different colour_, so the browser would render something
the contrast gate never examined, and the WCAG assertion would be a true
statement about a colour nobody sees. Fitting guarantees the emitted value is
the checked value.

## What the gate refuses to let you do

A `contrastWith` entry is what makes a pair checkable, so **deleting one is the
easiest possible way to make the gate pass**. It would simply stop examining
that pair and report success having verified less.

`verify-contrast.mjs` therefore independently asserts that **every `on-*` token
declares a partner**, and fails if one does not. `outline-variant` has no
partner deliberately and is not an `on-*` token: it is a decorative hairline,
and holding a purely cosmetic line to 3:1 would force it to look like a border.
That is a recorded design decision, not an omission.

Eight self-test cases pin the gate: a shortfall in the light scheme only, a
shortfall in the **dark** scheme only, the same colours passing at `nonText` and
failing at `normalText`, a deleted `contrastWith`, and a dangling reference. The
dark-only case is the one that matters most — checking a palette once in light
mode and deriving dark by inverting the ramp is precisely how this fails in
practice.

## Size, measured

`tools/verify-css-budget.mjs`, on the built artefact with comments stripped:

|                      | raw     | gzip        | brotli  | ADR-007 budget |
| -------------------- | ------- | ----------- | ------- | -------------- |
| main sheet           | 2.26 KB | **0.60 KB** | 0.50 KB | 2 KB gzip      |
| `@supports` fallback | 4.58 KB | **0.60 KB** | 0.46 KB | 1 KB gzip      |
| total                | 6.84 KB | **1.01 KB** | 0.82 KB |                |

The fallback is **twice the raw size of the main sheet and compresses to the
same 0.60 KB**, because it is pure repetition — every colour token re-declared
four times over, which is exactly the pattern the main sheet exists to avoid. It
is 59% of the shipped bytes and comes out in a single edit when `light-dark()`
clears Angular's browser floor.

This is the **only** numeric budget in the project. `05-performance-budgets.md`
defers the rest to Phase 9 on the grounds that a number invented today would be
invented rather than measured; this one is the exception solely because ADR-007
already states it.

## Using it

```html
<!-- the whole scheme control surface -->
<div data-tekad-scheme="dark">…</div>
```

Remove the attribute to follow the system preference — there is deliberately no
`"system"` value, because it would need its own CSS rule, which is the
variant-axis-as-selector pattern the governing rule forbids.

`tokens.json` is published as DTCG 2025.10 metadata for design tooling. It is
**never** a runtime dependency; the shipped artefact is the stylesheet.

## Not built yet

- **A reset layer.** `@layer tekad.reset` is declared in the layer order but is
  empty. It gets content when a component needs something reset, not before.
- **Consumer brand seeds.** ADR-007 says they run the same pipeline. The
  pipeline exists and is parameterised by `tokens/palette.json`; the public
  entry point for supplying a seed does not, and should be designed against a
  real consumer request.
- **Forced-colors.** ADR-007 decision 7 makes it a _release_ gate: every
  `box-shadow`-drawn focus ring or elevation needs a
  `@media (forced-colors: active)` substitute. There are no such rings yet
  because there are no styled components yet.
- **The typography scale.** Deferred with the same reasoning as the reset.
