import { InjectionToken, type Provider, type Signal } from '@angular/core';

/**
 * What a form field offers the control inside it.
 *
 * ── Why a token and not a content query ───────────────────────────────────
 *
 * A field could find its control with `contentChild`, and a control could find
 * its field by injecting the component class. Both create a dependency between
 * two packages that should not know about each other: `@tekad/input` must work
 * with no field at all, and `@tekad/form-field` must accept a control it has
 * never heard of. A token in the foundation layer is the only arrangement where
 * both are true.
 *
 * ── Why the field owns the description and the control owns nothing ───────
 *
 * `aria-describedby` is a list, and the things in it — a hint, one or more
 * error messages — are the field's, appearing and disappearing as validation
 * changes. A control that assembled that list would need to know what a hint
 * is. So the field computes the whole attribute value and the control simply
 * binds it.
 *
 * The one thing that travels the other way is the control's id, because
 * `<label for>` needs it and only the control knows whether the consumer
 * supplied one.
 */
export interface TekadFieldContext {
  /**
   * The value for the control's `aria-describedby`, or `null` when there is
   * nothing to describe.
   *
   * `null` rather than `''`: an empty `aria-describedby` is a reference to a
   * missing element, and some assistive technology reports that as an error
   * rather than as an absence.
   */
  readonly describedBy: Signal<string | null>;

  /** True when the field is showing an error, so the control can mark itself. */
  readonly invalid: Signal<boolean>;

  /**
   * Told to the field by the control, so `<label for>` can point at it.
   *
   * A method rather than a writable signal because it is a one-way
   * announcement: the field must never be able to rename the control's
   * element out from under a consumer who set the id themselves.
   */
  setControlId(id: string): void;
}

/** @see TekadFieldContext */
export const TEKAD_FIELD_CONTEXT = new InjectionToken<TekadFieldContext>('TEKAD_FIELD_CONTEXT');

/**
 * Provide a form field under {@link TEKAD_FIELD_CONTEXT}.
 *
 * @param field the field's own class
 */
export function provideTekadFieldContext(field: unknown): Provider {
  return { provide: TEKAD_FIELD_CONTEXT, useExisting: field };
}
