# ADR-013 — Forms integration

**Status:** Accepted · **Date:** 2026-08-27
**Evidence:** `docs/research/20-forms-strategy.md`

## Context
Signal Forms are stable in v22 with Material and Aria integration. Reactive
Forms are not deprecated, and enterprise adoption depends on them.

## Decision
Every TEKAD control implements **`FormValueControl`** (a `value` model signal,
no `checked`) or **`FormCheckboxControl`** (a `checked`, no `value`), emits a
`touch` output on blur, and keeps validation in the schema, not the control.

**Angular explicitly forbids implementing both `ControlValueAccessor` and
`FormValueControl` on the same component.** Reactive-Forms support therefore
ships as a **separate thin CVA adapter** in its own entry point
(`@tekad/forms/compat`). Angular's `SignalFormControl` / `compatForm` bridges
are documented as the alternative route.

## Alternatives
CVA-native with a Signal-Forms adapter — rejected, inverts the framework's
direction and ADR-002. Dual implementation — **forbidden by Angular**.

## Consequences
The compat adapter is public API with its own tests and SSR/a11y obligations,
and must be in the Phase 9 slice — discovering this constraint late would be
expensive.

---

## 2026-08-29 — correction: Angular does NOT forbid this, and that is worse

**The decision above is unchanged. Its stated reason is wrong**, and the
correction makes the decision more important rather than less — so this is a
dated correction, not a superseding ADR.

This ADR says: *"Angular explicitly forbids implementing both
`ControlValueAccessor` and `FormValueControl` on the same component."*

Measured against `@angular/forms` **22.1.4**, in a real browser, with a
signal-forms-only control in the same page as a passing control:

| | Result |
|---|---|
| Did Angular reject a component implementing both? | **No.** Zero boot errors, zero console errors. It rendered. |
| Which contract did it use? | The **`ControlValueAccessor`**. `writeValue` was called twice, with the correct value. |
| Did the `FormValueControl` value model bind? | **No.** The control rendered `""` where the field held `"changed-both"`. |
| Control: did a signal-forms-only control bind? | **Yes** — `"changed-signal"`. So the probe was measuring something. |

The mechanism is `FormField.ɵngControlCreate`:

```js
if (this.controlValueAccessor)        -> cvaControlCreate
else if (host.customControl)          -> customControlCreate
else if (elementIsNativeFormElement)  -> nativeControlCreate
else                                  -> throw NG1914
```

No branch rejects a host satisfying more than one. The CVA simply wins, and the
signal contract is never consulted.

**Why this is worse than a prohibition.** A prohibition fails loudly at the
moment the mistake is made. This compiles, boots, renders, and passes any test
that merely checks the control appears — while the value silently does not flow.
It is the failure mode that reaches production.

**Consequences for the decision.**

1. The separate `@tekad/forms/compat` entry point **stands**, and is now
   load-bearing rather than tidy. There is no framework error to fall back on.
2. `tools/verify-forms-contracts.mjs` becomes the **only** thing that catches
   this. It checks both routes to a CVA: an `implements` clause, and a class
   that provides `NG_VALUE_ACCESSOR` without ever naming the interface — the
   second is invisible to any rule that only reads heritage clauses.
3. Angular's own guidance agrees with the direction: the `FormField`
   documentation lists a `ControlValueAccessor` host as option 3, "**should only
   be used for backwards compatibility with reactive forms. Prefer options (1)
   and (2)**."

Also verified while checking this: `FormValueControl` and `FormCheckboxControl`
**are** importable from `@angular/forms/signals`, and the control contract is
`touch` (an `OutputRef<void>` the control emits) versus `touched` (an
`InputSignal<boolean>` the field pushes in). This ADR's phrase "emits a `touch`
output on blur" is correct; the near-identical `touched` input is a separate
thing and easy to confuse.

Evidence: `tools/verify-forms-assumptions.mjs`, which re-runs the whole
measurement on every CI build. **If a future Angular starts rejecting the
combination, that gate fails** — and this correction should be revisited,
because the lint rule would then be belt-and-braces after all.
