/**
 * `@tekad/input`
 *
 * A text input implementing Angular's `FormValueControl<string>` — a `value`
 * model and no `checked`, per ADR-013.
 *
 * Reactive Forms support is `@tekad/forms/compat`. Label, hint and error text
 * are `@tekad/form-field`, which wires them by ARIA IDREF; an input outside a
 * field is a working input, not a broken one.
 */
export { TekadInput } from './lib/tekad-input';
