# Forms Strategy

Research date 2026-08-26. Sources: angular.dev Signal Forms guides
(custom controls, migration), v22 announcement.

## Platform facts

- **Signal Forms are stable in v22**, with documentation and explicit
  Angular Material _and_ Angular Aria integration.
- `form(model, schemaFn)` derives the whole form tree from a signal model —
  controls are never constructed by hand. `form.field` is the `FormField`;
  `form.field()` is the callable `FieldState` (`.valid()`, `.touched()`, …).
  Templates bind `[formField]="path"`, which also drives disabled / readonly /
  hidden. Validators are declared in the schema.
- **Reactive Forms are not deprecated.** Compat APIs exist in both directions:
  `compatForm` wraps an existing `FormControl`/`FormGroup` inside Signal Forms;
  `SignalFormControl` exposes a signal form as a classic `FormControl`.

## Custom controls — the shape TEKAD must implement

Implement **`FormValueControl`** (expose a `value` **model signal**; must not
have a `checked` property) or **`FormCheckboxControl`** (expose `checked`; must
not have `value`). The `FormField` directive auto-detects which. Both extend
`FormUiControl`, whose optional input signals are `touched`, `dirty`, `errors`,
`valid`, `invalid`, `pending`, `disabled`, `disabledReasons`, `readonly`,
`hidden`, `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `name`.

Controls should emit a `touch` output on blur so `debounce('blur')` rules work.
**Validation logic belongs in the schema, not in the control.**

`@angular/aria` directives already satisfy this — they expose a `value` model
signal and integrate with `[formField]` without extra configuration.

## The hard constraint

> **Do not implement both `ControlValueAccessor` and
> `FormValueControl`/`FormCheckboxControl` on the same component.**

This is explicit in Angular's migration guide, and it settles a question the
TEKAD master prompt left open. A single TEKAD input **cannot** natively serve
both form systems.

## TEKAD decision

1. Every TEKAD form control implements **`FormValueControl`** (or
   `FormCheckboxControl`) as its native, canonical integration. Signal Forms
   is the first-class path — consistent with signals-canonical (ADR-002) and
   with the framework's own direction.
2. Reactive-Forms consumers are served by **a separate thin CVA adapter
   directive in its own secondary entry point** (working name
   `@tekad/forms/compat`), never by dual-implementing on the core component.
3. Consumers already on Reactive Forms can alternatively use Angular's own
   `SignalFormControl` / `compatForm` bridges; document both routes.
4. TEKAD does not build a third forms framework, and does not re-implement
   validation that the schema layer owns.

## Consequence

The compat adapter is public API with its own tests and its own SSR and
accessibility obligations. It must be in the Phase 9 vertical slice, because
"works with Reactive Forms" is a hard adoption requirement for enterprise
consumers and discovering the constraint late would be expensive.
