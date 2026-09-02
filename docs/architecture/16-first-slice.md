# The First Vertical Slice (Phase 9)

> The slice's purpose is to **prove the architecture**, not to fill a
> catalogue… If any of those hurts here, fix the foundation before adding
> components. — `ROADMAP.md`

Three things hurt. All three were foundation problems, all three were found by
a gate rather than by review, and all three are recorded here because the
components themselves are the least interesting part of this phase.

## What was built

|                                   |                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@tekad/button`                   | Made real: three appearances, a 44px hit target, `outline` focus, forced colours.                  |
| `@tekad/checkbox`                 | `FormCheckboxControl` — a `checked` model, no `value`. Native input, painted box, `indeterminate`. |
| `@tekad/core/forms/model-control` | The token a control provides so the adapter can reach it.                                          |
| `@tekad/forms/compat`             | ADR-013's Reactive Forms adapter, owed to this phase since Phase 7.                                |

Preceded by the measurement ADR-007 required before any of it —
`docs/architecture/15-ssr-encapsulation.md`.

## The three that hurt

### 1. `.tk-button` matched nothing

The button's CSS was written the obvious way: `.tk-button { … }`. The unit
suite was green. The button was 21 pixels tall, in the user agent's default
grey, with the user agent's 1px focus ring.

Emulated encapsulation rewrites `.tk-button` to
`.tk-button[_ngcontent-ng-cXXXX]` — the attribute Angular stamps on elements
_inside_ a component's template. A component whose selector decorates an
element the consumer wrote (`button[tkButton]`) has that element as its **host**,
and a host carries `_nghost-ng-cXXXX` instead. Not one rule could match.

Every selector in that file is `:host` now. The class list is still on the
element and still public — a consumer styling `.tk-button` from their own sheet
works — but the classes are the API and `:host` is the plumbing.

This is a general constraint for the native-element-decoration pattern, which
is the pattern TEKAD chose for good reasons (ADR-007 decision 7). Nothing in
the unit suite could have found it, because jsdom has no style engine.
`tools/verify-button-styling.mjs` found it on its first run.

### 2. `@layer` had never been tested

ADR-007 decision 1 has been load-bearing since Phase 4:

> Unlayered consumer rules then win regardless of specificity — no
> `!important`, no `::ng-deep`.

Nothing had ever checked it. It is also the claim most easily broken in
silence: Angular processes component styles, and if ng-packagr, the bundler or
the style injector dropped or reordered the at-rule, no other gate would
notice.

Measured now, in Chromium, against the built package:

- the layer order statement survives the build, in order;
- the button's own rules land **inside** `@layer tekad.components`;
- an unlayered `.consumer-override { background: rgb(1,2,3) }` in the page
  beats them, with no `!important`.

### 3. A foundation package's test reached for a component

The adapter's first spec imported `@tekad/checkbox`.
`@nx/enforce-module-boundaries` refused it, and it was right to: an adapter
that must work with _any_ control had a suite encoding one component's
behaviour as its definition of correct.

Split in two, which is better than the version that failed:

- `packages/forms/compat/…/compat-adapter.spec.ts` drives a **stub** control
  that spells out the token's entire contract. If the adapter ever needs
  something the stub lacks, the token's interface is too small — and that is
  the thing to fix.
- `packages/checkbox/…/checkbox-compat.spec.ts` is the integration: real
  control, real adapter, real `FormControl`, with a signal-forms sibling of the
  same component on the same page.

## The forms adapter, and the subtlety it turned on

ADR-013 required this to be a separate class. Its stated reason was wrong —
Angular does not forbid one class implementing both contracts, it silently
prefers the `ControlValueAccessor` and never binds the signal model — which
made the separation _more_ important, and left a real question: can a control
kept deliberately ignorant of Reactive Forms still be driven by them?

Yes, through one small token: a writable model, a form-owned disabled channel,
and the control's own `touch` output.

Two things it exposes are worth stating.

**`disabledByForm` is separate from `disabled`.** They have different owners
and can legitimately disagree. An author's `[disabled]="false"` must not fight
`control.disable()` on every change detection, so the control reads
`effectivelyDisabled`, which is the OR.

**The touch channel is the control's own `OutputRef`**, not something the
adapter invents. The first version had the adapter _reassign_ a method on the
injected control, which breaks the moment two things want to listen. Both form
systems now observe the identical event.

### The echo

The hardest part of the adapter is three lines, and it fails silently.

A signal effect does not run inline with the write that triggered it — it is
scheduled. So the obvious guard, `#writing = true` around `model.set(…)`, is
already cleared by the time the effect runs. The effect sees the form's own
value and reports it back as a user edit.

That is not an error. It is a form that goes dirty the instant it is populated,
and a loop for any form reacting to `valueChanges`.

The guard therefore has to survive until the effect runs, and be consumed
**exactly once** — "ignore this value forever" looks correct until the user
returns to the value the form last wrote, at which point a real edit vanishes.
Both halves have a test and a mutant.

## What the mutation gate found

Three things, in a phase where every suite was green.

**A weak test.** "Writes a user toggle back into the model" passed with the
checkbox mutated to toggle instead of reading the element — because one change
event from `false` lands on `true` either way. The discriminating case is a
change event that does _not_ flip the element; a toggling control goes to
`true` there and is permanently out of step with the box the user is looking
at.

**A mutant pointed at the wrong suite.** The disable path is edited in the
checkbox and caught in the compat integration suite, because the two channels
only disagree when a form is attached.

**Dead code.** The adapter had a "skip the first effect run" guard, written for
a good reason. Removing it broke nothing: Angular's `setUpControl` calls
`writeValue` synchronously during the directive's first `ngOnChanges`, before
any effect flushes, so the echo guard already covered it. It was deleted, and
`tools/mutants.json` records _why_ the mutant went — a mutant removed to make
a gate pass is how the gate stops meaning anything, and this was the opposite.

## Obligations discharged

| Owed by     | What                                                                          | Where                                             |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ADR-007     | Measure emulated-encapsulation SSR cost before Phase 9                        | `15-ssr-encapsulation.md`                         |
| ADR-007 d.8 | Enforce the ShadowDom ban                                                     | `verify-ssr-encapsulation.mjs`                    |
| ADR-013     | The CVA adapter, built against real controls                                  | `@tekad/forms/compat`                             |
| ADR-013     | Its own tests                                                                 | stub suite + integration suite                    |
| ADR-013     | A tree-shaking scenario proving compat does not reach a signal-forms consumer | `verify-treeshaking.mjs`, with a positive control |

## Still owed

- **`size-limit` per-entry budgets** (ADR-011). Now measurable — there are real
  components — and not yet built.
- **`axe` on every example**, and forced-colors visual snapshots. The
  forced-colors _behaviour_ is asserted for both components; the snapshots are
  not.
- **An SSR/hydration test per package.** The SSR probe measures encapsulation
  cost, which is not the same as proving these components hydrate.
- **Input, form field, label, dialog, select, table foundation** — the rest of
  the roadmap's slice. Dialog is reachable now (`showModal` centres itself);
  select needs positioning, which Phase 6 deliberately deferred until a
  component demanded it.

## Still unverified

Unchanged, and repeated because a phase full of accessibility work is exactly
where it would be tempting to imply otherwise:

- **No screen reader has been run.** What is proved is that the DOM presents
  what assistive technology is specified to act on — a native `<input
type="checkbox">` that stays in the accessibility tree, a real `<button>`,
  labels by containment, and IDREFs that resolve because nothing uses a shadow
  boundary.
- **Firefox/Gecko and real Safari.** Every browser number here is Chromium.
- **Parse cost**, from Phase 9's own SSR measurement: too noisy to conclude
  anything.
