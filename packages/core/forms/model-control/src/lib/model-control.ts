import {
  InjectionToken,
  type OutputRef,
  type Provider,
  type Signal,
  type WritableSignal,
} from '@angular/core';

/**
 * What a TEKAD control exposes so that `@tekad/forms/compat` can drive it from
 * Reactive Forms.
 *
 * ── Why this exists at all ────────────────────────────────────────────────
 *
 * ADR-013 originally said Angular forbids one class implementing both
 * `ControlValueAccessor` and a signal-forms contract. Measured in 22.1.4, it
 * does not: `FormField.ɵngControlCreate` resolves `if (controlValueAccessor)
 * … else if (customControl) …`, so a class doing both compiles, boots, renders,
 * and silently never binds its signal model. The decision to keep the CVA in a
 * separate class survived; only its reason changed, and got stronger.
 *
 * A separate class then needs a way to reach the control's model, and this is
 * it. `tools/verify-forms-contracts.mjs` enforces the separation; this makes
 * the separation workable.
 *
 * ── Why it is this small ──────────────────────────────────────────────────
 *
 * One writable model, one touch notification, one disabled channel. Everything
 * else a control has — validation, required, invalid, error text — is Angular's
 * concern in signal forms and the `FormControl`'s concern in reactive forms,
 * and mirroring it here would be a second source of truth (ADR-002).
 *
 * `model` is deliberately untyped as to *meaning*. A checkbox's model is its
 * `checked`, a text input's is its `value`; Angular's own contracts split those
 * into `FormCheckboxControl` and `FormValueControl` because a control has one
 * or the other, never both. The adapter does not care which — it writes what
 * the `FormControl` gives it and reports what the control produces.
 *
 * @template T the model's value type
 */
export interface TekadModelControl<T> {
  /**
   * The control's single writable model — its `checked` or its `value`.
   *
   * Writable because the CVA's `writeValue` must be able to push into it. That
   * is not a second source of truth: reactive forms own the value when a
   * `FormControl` is attached, and the adapter is the one thing allowed to
   * write.
   */
  readonly model: WritableSignal<T>;

  /**
   * Set by the adapter when Reactive Forms disables the control, via
   * `setDisabledState`.
   *
   * Separate from the control's own `disabled` input rather than sharing it,
   * because they have different owners and can disagree. A control can be
   * disabled by its author (`[disabled]="true"`) or by the form
   * (`control.disable()`), and collapsing the two would mean an author's
   * `false` fighting a form's `true` on every change detection.
   */
  readonly disabledByForm: WritableSignal<boolean>;

  /**
   * True when the control should behave as disabled — either channel.
   *
   * Exposed so the control has one thing to read in its template rather than
   * re-deriving the `||` in every place it matters and getting it wrong in one
   * of them.
   */
  readonly effectivelyDisabled: Signal<boolean>;

  /**
   * The control's `touch` output, emitted when the user leaves it.
   *
   * The SAME `OutputRef` the signal-forms contract requires — not a parallel
   * notification. Every TEKAD control already has one because
   * `FormValueControl` and `FormCheckboxControl` require it, so exposing it
   * here invents nothing and guarantees the two form systems observe the same
   * event.
   *
   * An `OutputRef` rather than a method the adapter could call, because the
   * control must not know an adapter exists. A method here would have to be
   * reassigned by the adapter to be useful — mutating an injected object, which
   * breaks the moment two things want to listen.
   */
  readonly touch: OutputRef<void>;
}

/**
 * @see TekadModelControl
 */
export const TEKAD_MODEL_CONTROL = new InjectionToken<TekadModelControl<unknown>>(
  'TEKAD_MODEL_CONTROL',
);

/**
 * Provide a control under {@link TEKAD_MODEL_CONTROL}.
 *
 * A named function rather than each control hand-writing the provider literal:
 * the `useExisting` + `forwardRef` shape is easy to get subtly wrong, and
 * getting it wrong produces a control the adapter cannot see — which fails as
 * "the form does not update" rather than as an error.
 *
 * @param control the control's own class, e.g. `provideTekadModelControl(TekadCheckbox)`
 */
export function provideTekadModelControl(control: unknown): Provider {
  return { provide: TEKAD_MODEL_CONTROL, useExisting: control };
}
