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
