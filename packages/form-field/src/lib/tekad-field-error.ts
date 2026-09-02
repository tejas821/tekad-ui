import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * An error message for a control, referenced from its `aria-describedby`.
 *
 * ── Why role="alert" and not aria-live="polite" ───────────────────────────
 *
 * An error appearing is a change the user must know about before they act
 * again — they have just been told their input is unacceptable. `role="alert"`
 * is `aria-live="assertive"` plus `aria-atomic`, which interrupts.
 *
 * That is deliberate and it is the exception, not the pattern. Everything else
 * in TEKAD that announces uses `polite` (see `TekadLiveAnnouncer`), because
 * assertive talks over whatever the user was reading.
 *
 * ── Why the element is not conditionally rendered here ────────────────────
 *
 * A consumer wraps this in `@if`. That is the correct shape: a live region
 * announces when its CONTENT changes, and an element that is created already
 * containing its message is announced on insertion. An element that exists
 * empty and is later filled also announces — but an element that exists,
 * filled, and is merely revealed with CSS announces NOTHING, which is the
 * common way an error message is seen and never heard.
 */
@Component({
  selector: 'tk-field-error',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-field-error.css',
  host: {
    '[attr.id]': 'resolvedId()',
    role: 'alert',
    class: 'tk-field-error',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadFieldError {
  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  /**
   * Public, unlike the `resolvedId` on other TEKAD components, because the
   * form field reads it to build `aria-describedby`. That is the whole API of
   * this component.
   */
  readonly resolvedId = computed(() => this.id() ?? this.generatedId);

  private readonly generatedId = uniqueId('tk-field-error');
}
