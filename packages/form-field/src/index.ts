/**
 * `@tekad/form-field`
 *
 * Label, hint and error text wired to the control inside them by ARIA IDREF.
 *
 * The field never queries for a component type: it offers
 * `TEKAD_FIELD_CONTEXT` and anything that injects it participates, so a
 * consumer's own control works exactly as a TEKAD one does (ADR-006 tier 2).
 */
export { TekadFormField } from './lib/tekad-form-field';
export { TekadFieldHint } from './lib/tekad-field-hint';
export { TekadFieldError } from './lib/tekad-field-error';
