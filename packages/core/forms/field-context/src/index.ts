/**
 * `@tekad/core/forms/field-context`
 *
 * The seam between a form field and the control inside it.
 *
 * A field owns the label, the hint and the error text; the control owns the
 * element those must point at. Neither can wire the other without a shared
 * reference, and the wiring is entirely made of ARIA IDREFs — which is why
 * ADR-007 decision 8 bans Shadow DOM: an IDREF does not cross a shadow
 * boundary, does not error, and resolves to nothing.
 */
export {
  TEKAD_FIELD_CONTEXT,
  provideTekadFieldContext,
  type TekadFieldContext,
} from './lib/field-context';
