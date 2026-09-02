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
| `@tekad/input`                    | `FormValueControl<string>` — the other half of Angular's split. Decorates a native `<input>`.      |
| `@tekad/form-field`               | Label, hint and error, wired to the control by ARIA IDREF. Not layout.                             |
| `@tekad/dialog`                   | A native `<dialog>` driven by `@tekad/overlay`'s deferred close — that primitive's first consumer. |

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

### 4. The field's parts could not be styled by the field

Same family as the button, arriving from the other direction. The hint and error
styles were written in the FIELD's stylesheet, as `.tk-field-hint` and
`.tk-field-error`. They never applied.

Those elements are **projected content**: they carry the scoping attribute of
the component that _declared_ them — the consumer's — not of the one they are
projected into. `.tk-field-error[_ngcontent-field]` matched nothing, the error
text inherited body colour instead of `danger`, and nothing anywhere said so.

Each part owns its own stylesheet now, all `:host`. Stated as a rule: **a
component styles its own host and its own template, and nothing else.** Both
violations of it this phase were invisible to the unit suites and both were
caught on a browser gate's first run.

The fix then exposed a real gap in an existing gate. `verify-contrast.mjs`
checks declared token _pairs_ — `on-danger` against `danger`, a filled danger
surface. The error text is `danger` used as text on `surface`, which is a
different pair and is not in the token manifest at all. A component reaching for
a token in a combination nobody declared is how a build-time contrast gate gets
bypassed with nobody bypassing it. Now measured from what the engine painted:
9.88:1.

## The dialog, and ADR-010's open question

`@tekad/overlay` had no consumer. A foundation package nothing uses is exactly
what CLAUDE.md rule 9 warns about, and Phase 6 had explicitly left the focus-trap
decision waiting on "a real fallback to confirm against".

ADR-010 anticipated a bespoke focus trap. Measured in Chromium:

|                                | Result                                           |
| ------------------------------ | ------------------------------------------------ |
| Is it actually modal?          | `:modal` matches — it is in the top layer.       |
| Can the background be focused? | No. `focus()` on the outside trigger is refused. |
| Does Tab escape, 12 presses?   | No interactive element outside is ever reached.  |
| Shift+Tab, 6 presses?          | No.                                              |
| Escape?                        | Closes it, with TEKAD handling no key.           |
| Focus restore?                 | Returns to the trigger, unaided.                 |

**So TEKAD writes no focus trap.** ADR-010 has a dated correction.

The check corrected itself on the way. Its first version asserted focus never
leaves the dialog, and failed: Chromium's cycle is periodic with period 5 and
passes through `document.body` as the wrap point. Body is outside the dialog by
any DOM test and is also not a control — it holds nothing and the next Tab is
back inside. "Focus escaped" was false; "focus stayed inside" was also false.
The true claim, and the one the decision rests on, is that focus never reaches an
_interactive_ element outside. The assertion was wrong, not the platform.

What TEKAD does supply is the exit animation, because the platform cannot: an
element leaves the top layer the instant `close()` is called. One frame after the
close is requested the element still has `open` and carries `closing`; it closes
afterwards, and the class is cleaned up rather than left on the node — the leak
P0's second-order review found, now asserted against a real element rather than
a double.

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

**A mutant that broke the build.** The dialog's heading-id mutant did not
compile, and the gate refused to count it — "the run went red" is guaranteed for
a mutant that fails to compile and says nothing about the suite. Rewritten to be
a plausible defect (a constant id rather than a derived one), it was caught.

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
- **Select and the table foundation** — the rest of the roadmap's slice. Select
  needs positioning, which Phase 6 deferred until a component demanded it; it is
  the first that does, so Floating UI is now a real decision rather than a
  speculative one (ADR-010 budgets 10 KB gzip against its measured 6.4 KB).
- **The `position: fixed` overlay fallback.** ADR-010's correction is explicit
  that it says nothing about that path, which remains unbuilt and unmeasured
  and is where a bespoke focus trap may still be needed.

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

## State at the end of Phase 9

|                     |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| Packages            | 9 — core, theme, overlay, button, checkbox, input, form-field, forms, dialog |
| Unit tests          | 102                                                                          |
| Mutants, all caught | 28                                                                           |
| Browser gates       | 4, over one shared probe app                                                 |
| CI gates            | 22                                                                           |
