# TEKAD

A long-term, production-grade Angular UI ecosystem.

Angular 22 · standalone-only · signals-canonical · accessibility verified
behaviourally, in a real browser.

**Guide site:** https://tejas821.github.io/tekad-ui/

## Install

Published on npm under the `@tekad` scope. Install the components you use, the
foundation, and the theme:

```bash
npm install @tekad/button @tekad/input @tekad/core @tekad/theme
```

```css
/* styles.css */
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadButton } from '@tekad/button';

@Component({
  imports: [TekadButton],
  template: `<button tkButton appearance="filled">Save</button>`,
})
export class Example {}
```

Every package has its own README with usage. Packages: `core`, `theme`,
`overlay`, `forms`, `button`, `checkbox`, `input`, `form-field`, `dialog`,
`select`, `switch`, `tabs`, `tooltip`, `table`, `card`, `badge`, `divider`,
`icon`, `progress`.

---

## What is actually here

Nine packages, ten if you count the two secondary entry points that carry the
forms seams.

| Package             | What it is                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| `@tekad/core`       | `uniqueId`, the live announcer, and the two forms tokens. Four entry points. |
| `@tekad/theme`      | The design tokens. One generated stylesheet, 1.01 KB gzip.                   |
| `@tekad/overlay`    | The deferred-close top-layer primitive.                                      |
| `@tekad/button`     | Three appearances, a 44px hit target, `outline` focus.                       |
| `@tekad/checkbox`   | `FormCheckboxControl` — a native input with a box painted over it.           |
| `@tekad/input`      | `FormValueControl<string>` — decorates a native `<input>`.                   |
| `@tekad/form-field` | Label, hint and error, wired to the control by ARIA IDREF.                   |
| `@tekad/dialog`     | A native `<dialog>` + `showModal()`, driven by the overlay primitive.        |
| `@tekad/forms`      | `/compat` — the Reactive Forms adapter.                                      |

Plus five probe applications that exist only so gates have something real to
measure, and 22 CI gates.

**102 unit tests. 28 mutants, all caught. Four browser gates.**

---

## The idea

Most of this repository is not components. It is **evidence**, and the
machinery that keeps the evidence honest.

Two rules do most of the work.

### Every gate ships with a self-test proving it fails when it should

Three of the first five gates written were vacuous or wrong, and only their own
self-tests found it. One example: the module-boundary rule that was supposed to
ban charting libraries **could not fire** — it takes its external branch only
when the package is installed, and a banned package never is. The rule passed
every build and guarded nothing.

### Every load-bearing behaviour has a mutant

The unit suites had no equivalent of the self-tests, and needed one more badly.
The live-announcer suite went green on its first run; deleting the single line
that makes a repeated screen-reader announcement audible left **nine of its
eleven tests still passing**.

`tools/verify-mutation.mjs` now pairs each plausible defect with the test that
must catch it, and requires _that named test_ to fail. "The run went red" is not
accepted as evidence — a mutant that fails to compile fails everything, and a
renamed test leaves the run red for a reason nobody chose.

---

## Things that were measured, and were not what was expected

Each of these overturned or closed an architectural decision, and was appended
to the ADR it corrects.

**Angular does not forbid implementing both forms contracts.** ADR-013 said it
did. Measured in `@angular/forms` 22.1.4: Angular accepts the component, raises
no error, silently prefers the `ControlValueAccessor`, and the signal-forms
model never binds. That is worse than a prohibition — it compiles, boots,
renders, and passes any test that checks the control appears. The decision to
keep them apart survived and became load-bearing.

**Emulated view encapsulation costs nothing at the transfer layer.** ADR-007
required this measured before Phase 9. On a 1,000 × 8 table the `_ngcontent`
attribute adds **+87.7% raw** and, after gzip, the document is **4.8% smaller**
than the unencapsulated one — the same 27 bytes 9,005 times is the easiest input
a compressor will ever see. The real cost is the _component instance_: a
component per cell is **+51% brotli** and 2.8× the elements. A table cell is not
a component.

**`showModal()` supplies the focus trap.** ADR-010 anticipated building one.
Measured in Chromium: Tab across 12 presses never reaches an interactive element
outside the dialog, Shift+Tab across 6 does not either, Escape closes it with no
key handled by TEKAD, and focus returns to the trigger unaided. Several hundred
lines not written.

**`@layer` works, and had never been tested.** ADR-007's central promise —
unlayered consumer rules beat TEKAD's regardless of specificity, so no
`!important` and no `::ng-deep` — had been load-bearing since Phase 4 with
nothing checking it. It now has evidence.

**OKLCH lightness is not WCAG luminance.** Five hues at identical OKLCH
lightness and chroma, all in gamut, span 4.054:1 to 4.550:1 on white — the AA
threshold falls _inside_ the spread. Tones are generated in OKLCH and then
checked in sRGB.

---

## Two bugs worth knowing about if you write Angular

Both would have shipped. Both were invisible to a green unit suite. Both were
caught by a browser gate on its first run.

**A component that decorates an element the consumer wrote must style it with
`:host`.** Angular rewrites `.tk-button` to `.tk-button[_ngcontent-…]`, an
attribute stamped on elements _inside_ a template. The component's own host
carries `_nghost-…`. Not one rule matched: the button rendered 21 pixels tall in
the user agent's default grey.

**Projected content cannot be styled from the component it is projected into.**
It carries the scoping attribute of the component that _declared_ it. The form
field's error text was not red and nothing anywhere said so.

The rule that came out of both: **a component styles its own host and its own
template, and nothing else.**

---

## Layout

```
packages/          the libraries
apps/              probe apps — nothing is a demo; every element is asserted about
tools/             the gates, each with a *.test.mjs self-test
  mutants.json     plausible defects, each paired with the test that must catch it
public-web/
  angular-web/     the library guide site, deployed to GitHub Pages
```

---

## Running it

```bash
corepack enable pnpm
pnpm install                 # the lockfile is committed; CI installs frozen

pnpm run verify              # format, gates, gate self-tests, tests, lint, typecheck
pnpm run verify:packages     # against dist/, because that is what a consumer gets
pnpm run verify:mutation     # do the tests fail when the code is wrong?
pnpm run verify:slice        # four browser gates, real Chromium
pnpm run verify:ssr          # encapsulation cost, with budgets
pnpm run verify:treeshaking  # nine scenarios, each with a positive control
```

Node `^22.22.3 || ^24.15.0 || ^26.0.0`, pnpm 11.24.0, Nx 23.1.1.

---

## What is deliberately not here

Listed because "not built" and "not thought about" look identical from outside.

- **A chart engine.** Never — a standing project rule. Charts are optional
  integrations or recipes.
- **A focus trap.** Measured unnecessary for the modal path. The
  `position: fixed` fallback is a separate, still-open question.
- **Positioning.** Deferred until a component demanded it. Select is the first
  that does, so Floating UI is now a real decision rather than a speculative one.
- **`@tekad/forms` wrapping Angular's contracts.** `FormValueControl`,
  `FormCheckboxControl` and the `touch`/`touched` pair are Angular's. Wrapping
  them would put a TEKAD name and version on an API Angular maintains.
- **NgModules**, in any public API.

---

## What has never been verified

Stated plainly, because a repository this full of accessibility work is exactly
where it would be tempting to imply otherwise.

- **No screen reader has been run, at any point.** What is proved is that the
  DOM presents what assistive technology is _specified_ to act on — a real
  `<input type="checkbox">` that stays in the accessibility tree, real
  `<button>` elements, labels by containment, and IDREFs that resolve because
  nothing uses a shadow boundary. That is not the same claim.
- **Firefox/Gecko and real Safari.** Every browser number here is Chromium, with
  some WebKitGTK evidence from prototype P0 — which does not certify Safari.
- **Parse cost.** Measured, and the run-to-run noise exceeds every difference.
  No conclusion drawn.
- **The `position: fixed` overlay fallback.**

---

## Status

Phases 0–9 of 15; v0.1.0 is the first public release. The roadmap is in
`ROADMAP.md`.

## Releasing

```bash
node tools/set-version.mjs 0.2.0   # one version for every package
git commit -am "release: v0.2.0" && git tag v0.2.0 && git push origin main --tags
```

The `Release to npm` workflow builds, verifies and publishes with provenance.

## License

Apache-2.0 © Tejas Kadam
