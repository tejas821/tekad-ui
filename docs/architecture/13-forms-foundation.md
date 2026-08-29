# Forms Foundation (Phase 7)

This phase found that ADR-013 was wrong about _why_ it was right.

No forms package was built. What was built is the measurement that corrects the
ADR, and the gate that the correction makes necessary.

## ADR-013's central claim, tested

> "Angular explicitly forbids implementing both `ControlValueAccessor` and
> `FormValueControl` on the same component."

Everything in Phase 7 rests on that sentence. It is why reactive-forms support
ships as a separate `@tekad/forms/compat` entry point instead of a second
interface on every control. So it was tested before anything was built on it —
in a real browser, against `@angular/forms` 22.1.4, with a signal-forms-only
control in the same page as a positive control.

|                                                   | Result                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Did Angular reject a component implementing both? | **No.** Zero boot errors, zero console errors. It rendered.                |
| Which contract did it use?                        | The **`ControlValueAccessor`** — `writeValue` called twice, correct value. |
| Did the `FormValueControl` value model bind?      | **No.** Rendered `""` where the field held `"changed-both"`.               |
| Control: did a signal-forms-only control bind?    | **Yes** — `"changed-signal"`.                                              |

The mechanism is `FormField.ɵngControlCreate`:

```js
if (this.controlValueAccessor)        -> cvaControlCreate
else if (host.customControl)          -> customControlCreate
else if (elementIsNativeFormElement)  -> nativeControlCreate
else                                  -> throw NG1914
```

No branch rejects a host satisfying more than one. The CVA wins and the signal
contract is never consulted.

## Why being wrong here makes the decision matter more

A prohibition fails at the moment you make the mistake. This does not fail at
all. A TEKAD control implementing both would:

- compile;
- boot without error;
- render;
- pass any test that checks the control appears;

and silently never bind its value. That is the failure mode that reaches
production, gets reported as "the form doesn't save", and takes a day to trace
back to an `implements` clause nobody thought was load-bearing.

So ADR-013's **decision** is unchanged and now more important. Its **reason** is
corrected in a dated section on the ADR rather than a superseding one, because
nothing about what TEKAD should do has changed.

## The gate this makes necessary

`tools/verify-forms-contracts.mjs` is the only thing that catches this — there
is no framework error to fall back on. It checks **two** routes to a CVA:

1. an `implements ... ControlValueAccessor` clause on a class that also carries
   a signal-forms contract;
2. a class that provides **`NG_VALUE_ACCESSOR`** while declaring a `value` or
   `checked` model — which registers a CVA without the words
   `ControlValueAccessor` appearing anywhere.

The second is the one that matters. A rule reading only heritage clauses passes
it, and the binding is lost just the same. There is a fixture for it.

The `legal` fixture holds a signal-forms control **and** a separate CVA adapter
in the same package, because that is the sanctioned shape and a rule that
rejected it would make `@tekad/forms/compat` impossible to write.

## Two smaller corrections, from the same session

**`FormValueControl` and `FormCheckboxControl` are importable.** An initial read
of the `@angular/forms/signals` export list suggested they were not — they do
not appear in the visible `export { ... }` block. Compiling an actual import
proved otherwise. Recorded because the wrong conclusion was nearly written down.

**`touch` and `touched` are different things**, and the names are one letter
apart:

|           | Direction       | Type                   |
| --------- | --------------- | ---------------------- |
| `touch`   | control → field | `OutputRef<void>`      |
| `touched` | field → control | `InputSignal<boolean>` |

ADR-013's "emits a `touch` output on blur" is correct. The probe got this wrong
on its first build and the compiler caught it, which is the good case.

## No package was built

`@tekad/forms` does not exist yet, and that is deliberate.

The control contract **is Angular's** — `FormValueControl`, `FormCheckboxControl`
and the `touch`/`touched` pair all come from `@angular/forms/signals`. Wrapping
them would add a TEKAD name and a TEKAD version on top of an API Angular
maintains, which is the "KEEP" in CLAUDE.md rule 1.

The one piece of genuine TEKAD code this phase implies is the **CVA adapter** in
`@tekad/forms/compat` — and ADR-013 already says it "must be in the Phase 9
slice". An adapter needs a control to adapt. Building one now would mean
designing its API against no call site, then discovering in Phase 9 what it
should have been.

This is the same shape as Phase 3: the deliverable is the constraint, enforced,
plus an honest record of what the framework actually does.

## What Phase 9 owes this phase

- **The CVA adapter**, built against the slice's real controls.
- **Its own tests, SSR obligations and accessibility obligations** — ADR-013 is
  explicit that the adapter is public API, not a convenience.
- **A tree-shaking scenario**, so `@tekad/forms/compat` is proved not to reach a
  consumer who only uses signal forms.

## Watching for the framework to change

`tools/verify-forms-assumptions.mjs` re-runs the whole measurement on every CI
build, including the positive control. **If a future Angular starts rejecting
the combination, that gate fails** — and this correction should be revisited,
because the lint rule would then be belt-and-braces after all.

That is the same arrangement as ADR-005's assumptions gate: a failure means a
decision rests on facts that have moved, not that something is broken.
