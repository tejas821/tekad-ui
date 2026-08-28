# Overlay Strategy

Research date 2026-08-26. Browser support verified against caniuse/MDN.
Bundle sizes measured with esbuild + gzip -9 from published tarballs.

## Platform substrate — verified support

| Feature | Chrome/Edge | Firefox | Safari | Global |
|---|---|---|---|---|
| `popover` attribute | 114+ | 125+ | 17.0+ | **91.5%** |
| `popover="hint"` | 151+ | 153+ | **none** | 71.7% |
| CSS anchor positioning | 125+ | 147+ | 26.0+ | **84.1%** |
| `<dialog>` | 37+ | 98+ | 15.4+ | **96.1%** |
| `inert` | 102+ | 112+ | 15.5+ | **94.7%** |
| `@starting-style` | 117+ | 129+ | 17.5+ | 90.7% |
| `transition-behavior` | 117+ | 129+ | 17.4+ | 90.7% |
| **CSS `overlay` property** | 117+ | **none** | **none** | **73.5%** |

### What the platform gives free
`popover` grants top layer (escaping ancestor `overflow`, `transform`,
`filter`, `contain` and all `z-index`), `::backdrop`, `:popover-open`, light
dismiss for `auto`/`hint`, two independent stacks with correct nested-close
semantics, and — with `popovertarget` — implicit `aria-details`/`aria-expanded`,
tab-order insertion and focus restore on Escape.

`<dialog>.showModal()` grants top layer, **automatic outside-inertness**,
implicit `aria-modal="true"`, focus placement, and Escape-closes-topmost.

### What it does not give
Positioning; focus trapping (outside `<dialog>`); ARIA roles;
**focus-on-open for popovers** — `showPopover()` only changes tab order.

## The three sharp edges

1. **The `overlay` property gap is the go/no-go risk.** Without it (Firefox,
   Safari — ~26% of traffic) a closing popover or dialog is demoted from the
   top layer on the first frame of its exit transition, so it can be clipped
   or painted under ancestor stacking contexts mid-animation.
2. **`showModal()` force-closes all `auto` popovers.** Opening a modal from a
   menu silently kills the menu. Sequencing is a design constraint.
3. **`showPopover()` throws `InvalidStateError`** when called re-entrantly from
   a `beforetoggle` listener — trivially reachable from animation code.

## Positioning engines

**CSS anchor positioning** handles flip/shift/hide natively
(`position-try-fallbacks`, `@position-try`, `position-try-order`,
`position-visibility`, `anchor-size()`). Two disqualifying limits for a
general library: it has **no JS-observable output** — TEKAD cannot read the
resolved side in TypeScript to drive state, arrows or ARIA — and it has **no
"available space" clamp** equivalent to Floating UI's `size`.

**Floating UI `@floating-ui/dom` 1.8.0**, MIT, published 2026-07-11, healthy
cadence. Measured gzip: full surface 8.4 KB; the realistic subset
(`computePosition, flip, shift, offset, autoUpdate`) **6.4 KB**. Provides
`size` (clamps max-height/width to available space — mandatory for select,
combobox, menu), JS-observable `{x, y, placement, middlewareData}`,
`hide` with separate `referenceHidden`/`escaped`, `inline` for text ranges,
and `autoUpdate` traversing **shadow DOM and iframe boundaries**.

## `@angular/cdk/overlay` in v22 — measured

It **already uses the Popover API by default**: `createOverlayRef` reads
`OVERLAY_DEFAULT_CONFIG.usePopover ?? true`, feature-detects
`'showPopover' in document.body`, sets `popover="manual"` and calls
`showPopover()`. Legacy z-index remains as fallback inside
`@layer cdk-overlay`. It does **not** use CSS anchor positioning — positioning
is still `getBoundingClientRect()` maths.

| Import | gzip |
|---|---|
| Full `@angular/cdk/overlay` | **24.3 KB** |
| Only the six factories | 23.8 KB |
| `@angular/cdk/a11y` | 12.7 KB |
| `@angular/cdk/portal` | 2.2 KB |

**It does not meaningfully tree-shake** — the minimal factory import is 98% of
the full barrel, because `createOverlayRef` transitively pulls
`OverlayContainer`, `ScrollDispatcher`, `ViewportRuler`, `Directionality`,
`Platform`, portals and scrolling. Budget ~24 KB gzip fixed.

Its focus trap is **pre-`inert`**: injected visually-hidden sentinel anchors,
and `@angular/cdk/dialog` maintains an `_ariaHiddenElements` map toggling
`aria-hidden` on siblings. Sentinel traps do not block pointer interaction or
an AT virtual cursor outside the trap.

## Recommendation — hybrid, TEKAD-owned

| Criterion | CDK overlay | Platform-only | Floating UI only | **Hybrid** |
|---|---|---|---|---|
| Bundle cost | 3 | 10 | 8 | 8 |
| SSR safety | 9 | 8 | 6 | 8 |
| A11y correctness | 7 | 6 | 5 | **8** |
| Browser reach | 10 | 6 | 10 | 10 |
| Maintenance burden | 9 | 5 | 6 | 6 |
| Control | 4 | 10 | 9 | 9 |
| **Total** | 42 | 45 | 44 | **49** |

- **Top layer:** `popover` for non-modal surfaces; `<dialog>.showModal()` for
  modal dialog and modal drawer — it hands over `inert`, `aria-modal`, Escape
  and focus restore for free at 96.1% reach. Feature-detect exactly as CDK
  does, with a `position: fixed` + `@layer` z-index fallback.
- **Dismissal:** `popover="auto"` where native stack semantics are wanted;
  `popover="manual"` plus TEKAD's dispatcher for nested portalled submenus and
  tooltips. **Never `popover="hint"`** — Safari has zero support.
- **Inertness:** `inert` (94.7%) for any non-`<dialog>` modal surface. Never
  ship the sibling-`aria-hidden` walk.
- **Positioning:** Floating UI as the always-correct baseline (6.4 KB gzip),
  because `size` and JS-observable placement are unavailable in CSS. Layer CSS
  anchor positioning behind `@supports (anchor-name: --x)` as a zero-JS fast
  path for tooltip and popover only.
- **Public placement API is logical** (`block-start`, `inline-end`) and maps
  down to whichever engine is active, so RTL is correct by construction.

**Why not CDK:** ~24 KB gzip that does not tree-shake, a dictated DOM/CSS/
`@layer` structure, and pre-`inert` a11y internals. For a library whose pitch
is being lean and Angular-22-first, that is the wrong foundation — even though
the CDK itself is good.

## Must be prototyped before committing

1. **Exit animation in Firefox and Safari without CSS `overlay`.** Go/no-go.
2. Nested overlay matrix: menu → submenu → dialog → select-in-dialog →
   tooltip-on-menu-item. Escape closes topmost only; `showModal()` must not
   eat an open menu.
3. **Screen-reader pass on `<dialog>.showModal()`** — NVDA/Firefox,
   JAWS/Chrome, VoiceOver/Safari+iOS, TalkBack — against a
   `div` + `inert` + `role="dialog"` control. This is the one unknown primary
   sources could not resolve, and the modal strategy rests on it.
4. Combobox focus model: APG requires DOM focus to stay on the input with
   `aria-activedescendant`. Verify it survives the popup being in the top layer
   and in a different DOM position.
5. Bundle proof: build Select end to end. Target **under 10 KB gzip** for
   overlay foundation + positioning, versus the measured 24 KB CDK baseline.
6. SSR first paint: no flash at (0,0), no mismatch with an overlay open on
   first render.
7. Mobile virtual keyboard — `visualViewport` handling; covered by neither
   Floating UI's `autoUpdate` nor anchor positioning.
8. Shadow DOM: `composedPath()` dismissal, `getOverflowAncestors` traversal,
   and whether anchor positioning crosses shadow boundaries (undocumented).

## APG requirements captured

Modal dialog: focus moves inside on open; Tab wraps; Escape closes; focus
returns to invoker; visible close control; `aria-modal="true"` only when code
**and** visual styling both prevent outside interaction. Combobox: **DOM focus
stays on the input**, AT focus moves via `aria-activedescendant`; Alt+Down
opens without moving focus. Tooltip: never receives focus; Escape dismisses;
**a tooltip containing focusable elements must be built as a non-modal dialog
instead** — the APG tooltip pattern is explicitly still without consensus.

`aria-modal` is an annotation, not enforcement. `inert` is the enforcement.
Never the reverse.
