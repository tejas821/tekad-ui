import { DestroyRef, Directive, effect, forwardRef, inject, untracked } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TEKAD_MODEL_CONTROL } from '@tekad/core/forms/model-control';

/**
 * Drives a TEKAD control from Reactive Forms.
 *
 * ```html
 * <tk-checkbox tkCompat [formControl]="acceptedTerms">I accept</tk-checkbox>
 * ```
 *
 * ── Why this is a separate directive, not an interface on the control ─────
 *
 * ADR-013 said Angular forbids one class implementing both
 * `ControlValueAccessor` and a signal-forms contract. It does not. Measured
 * against `@angular/forms` 22.1.4 in a real browser
 * (`tools/verify-forms-assumptions.mjs`): Angular accepted the component,
 * raised no error, silently preferred the `ControlValueAccessor`, and the
 * signal-forms `value` model never bound — the control rendered an empty
 * string where the field held its value.
 *
 * That is worse than a prohibition. A prohibition fails at the moment the
 * mistake is made; this compiles, boots, renders, and passes any test that
 * only checks the control appears. So the decision — a separate adapter —
 * survived the correction and became more important, and
 * `tools/verify-forms-contracts.mjs` is the only thing standing between TEKAD
 * and a control that looks correct and is not.
 *
 * ── Why it is opt-in ──────────────────────────────────────────────────────
 *
 * `[tkCompat]` must be written, rather than the adapter matching
 * `[formControl]` on its own. Two reasons, and the second decides it:
 *
 *   1. Tree-shaking. A consumer using only signal forms never imports this
 *      entry point and never pays for it — asserted by a scenario in
 *      `tools/verify-treeshaking.mjs`, not assumed.
 *
 *   2. Once this directive is on a host, the CVA wins and the signal-forms
 *      contract on that element is dead. Making that happen implicitly, from
 *      an attribute the consumer wrote for another reason, would silently
 *      switch which form system a control belongs to.
 */
@Directive({
  selector: '[tkCompat]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TekadCompatAdapter),
      multi: true,
    },
  ],
})
export class TekadCompatAdapter implements ControlValueAccessor {
  /**
   * The host control, reached through the token it provides.
   *
   * `{ self: true }` deliberately: the adapter must bind to the control on its
   * OWN element. Without it, `<tk-checkbox><span tkCompat></span></tk-checkbox>`
   * resolves to the ancestor checkbox and quietly drives a control the consumer
   * did not point at — a bug that looks like "the wrong field updates".
   */
  readonly #control = inject(TEKAD_MODEL_CONTROL, { self: true });

  /**
   * Captured as a field, not called where it is used.
   *
   * `inject()` only works during construction. `registerOnTouched` is called
   * later, by Reactive Forms, outside any injection context — reaching for
   * `inject(DestroyRef)` there throws NG0203.
   */
  readonly #destroyRef = inject(DestroyRef);

  #onChange: (value: unknown) => void = () => {};
  #onTouched: () => void = () => {};

  /**
   * The value most recently pushed in by `writeValue`, waiting to be recognised
   * once by the effect below.
   *
   * ── Why a pending value and not a boolean flag ────────────────────────
   *
   * The obvious guard is `#writing = true` around the model write. It does not
   * work, and it fails quietly: a signal effect does not run inline with the
   * write, it is SCHEDULED. By the time it runs, the flag has been cleared in
   * the `finally`, the effect sees the form's own value, and reports it back as
   * a user edit — which marks a pristine form dirty the instant it is
   * populated, and loops for any form that reacts to `valueChanges`.
   *
   * So the guard has to survive until the effect actually runs, and it has to
   * be consumed exactly once. It cannot simply be "ignore this value forever":
   * a user setting the same value again later is a real edit and must be
   * reported.
   */
  #pendingFromForm: { readonly has: boolean; readonly value: unknown } = {
    has: false,
    value: undefined,
  };

  /*
   * There is deliberately NO "skip the first effect run" guard here.
   *
   * One was written — effects run once on creation, and reporting the
   * control's initial value would mark a form dirty before anyone touched it.
   * The mutation gate then showed it was dead code: removing it broke nothing,
   * because Angular's `setUpControl` calls `writeValue` synchronously during
   * the directive's first `ngOnChanges`, which is before any effect flushes.
   * The pending-value guard below therefore already covers the first run.
   *
   * Without a `[formControl]` there is no guard needed either: `#onChange` is
   * still the no-op, so the first run reports to nobody.
   *
   * Kept as a comment rather than as defensive code, per CLAUDE.md rule 9 — an
   * abstraction needs a concrete current use or a measured benefit, and this
   * one was measured not to have either.
   */

  constructor() {
    const ref = effect(() => {
      const next = this.#control.model();

      // untracked so the guard reads never become dependencies of this effect.
      // Only the model should retrigger it.
      const pending = untracked(() => this.#pendingFromForm);
      this.#pendingFromForm = { has: false, value: undefined };

      // The echo of our own writeValue: swallowed exactly once.
      if (pending.has && Object.is(next, pending.value)) return;

      this.#onChange(next);
    });
    // Subscribed ONCE, here, and dispatched through a mutable field.
    //
    // The obvious alternative — subscribing inside registerOnTouched — throws.
    // Angular's `cleanUpControl` calls `registerOnTouched(noop)` during
    // teardown, by which point the view is destroyed and both
    // `DestroyRef.onDestroy` and a fresh subscription raise NG0911. Found by
    // this directive's own spec, in the cleanup phase rather than in an
    // assertion.
    const sub = this.#control.touch.subscribe(() => this.#onTouched());
    this.#destroyRef.onDestroy(() => {
      sub.unsubscribe();
      ref.destroy();
    });
  }

  /* ── ControlValueAccessor ─────────────────────────────────────────────── */

  writeValue(value: unknown): void {
    this.#pendingFromForm = { has: true, value };
    this.#control.model.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.#onChange = fn;
  }

  /**
   * Where the control's blur reaches Reactive Forms.
   *
   * The constructor holds the single subscription to the control's own `touch`
   * output — the same `OutputRef` the signal-forms contract requires — and this
   * only swaps the callback it dispatches to. Both form systems therefore
   * observe the identical event, and the control never learns which one it is
   * in.
   *
   * Reactive Forms calls this during teardown as well as setup, so it must do
   * nothing that needs a live view.
   */
  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  /**
   * Reactive Forms disabling the control.
   *
   * Written to `disabledByForm`, NOT to the control's own `disabled` input.
   * They have different owners and can legitimately disagree — an author's
   * `[disabled]="false"` must not fight `control.disable()` on every change
   * detection — so the control reads `effectivelyDisabled`, which is the OR of
   * the two.
   */
  setDisabledState(isDisabled: boolean): void {
    this.#control.disabledByForm.set(isDisabled);
  }
}
