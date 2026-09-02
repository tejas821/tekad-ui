import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  type ModelSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { uniqueId } from '@tekad/core/primitives/identity';
import { provideTekadModelControl, type TekadModelControl } from '@tekad/core/forms/model-control';
import { TEKAD_FIELD_CONTEXT } from '@tekad/core/forms/field-context';

/**
 * A text input.
 *
 * ── The contract ──────────────────────────────────────────────────────────
 *
 * `FormValueControl<string>` — a `value` model and no `checked`, the other half
 * of Angular's split and the counterpart to the checkbox's
 * `FormCheckboxControl`. A control has one or the other, never both.
 *
 * Reactive Forms support is `@tekad/forms/compat`, exactly as for the checkbox,
 * and for the same measured reason: a class implementing both contracts
 * compiles, boots, renders and silently never binds its signal model.
 *
 * ── Why it decorates a native input ───────────────────────────────────────
 *
 * `input[tkInput]`, like the button and unlike the checkbox. A text field needs
 * no box painted over it, so there is nothing to wrap and every reason not to:
 * the element keeps its type, its autofill, its spellcheck, its IME behaviour,
 * its `:user-invalid` styling, its forced-colors mapping, and — the one that
 * matters here — its identity as the thing a `<label for>` and an
 * `aria-describedby` point at.
 *
 * ── The field wiring ──────────────────────────────────────────────────────
 *
 * When this input sits inside a `<tk-form-field>`, the field owns the hint and
 * the error text and computes the whole `aria-describedby` value; the input
 * binds it and tells the field its id so `<label for>` resolves.
 *
 * That entire mechanism is ARIA IDREFs, which is why ADR-007 decision 8 bans
 * Shadow DOM: an IDREF does not cross a shadow boundary, does not error, and
 * resolves to nothing — leaving a control that renders correctly and is
 * unlabelled.
 *
 * With no field, all of it is `null` and the input is a plain input.
 */
@Component({
  selector: 'input[tkInput], textarea[tkInput]',
  standalone: true,
  template: '',
  styleUrl: './tekad-input.css',
  providers: [provideTekadModelControl(TekadInput)],
  host: {
    '[attr.id]': 'resolvedId()',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    // aria-invalid rather than a class: it is what assistive technology reads,
    // and CSS can select on it. A class would need both.
    '[attr.aria-invalid]': 'ariaInvalid()',
    '[disabled]': 'effectivelyDisabled()',
    '[value]': 'value()',
    '[attr.readonly]': 'readonly() ? "" : null',
    '[attr.required]': 'required() ? "" : null',
    '[class]': '"tk-input"',
    '(input)': 'onInput($event)',
    '(blur)': 'onBlur()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadInput implements FormValueControl<string>, TekadModelControl<string> {
  /** The signal-forms contract: `value`, and no `checked`. */
  readonly value: ModelSignal<string> = model<string>('');

  /**
   * Emitted when the user leaves the control.
   *
   * `touch` (an `OutputRef<void>` the control emits), not `touched` (an
   * `InputSignal<boolean>` the field pushes in). One letter apart, opposite
   * directions, both on the same contract.
   */
  readonly touch = output<void>();

  /** Pushed in by a bound field to reflect its touched state. */
  readonly touched = input<boolean>(false);

  /** Disabled by the component's author. @see disabledByForm */
  readonly disabled = input<boolean>(false);

  readonly readonly = input<boolean>(false);
  readonly required = input<boolean>(false);

  /**
   * Pushed in by a bound field when validation fails.
   *
   * The field ALSO knows, from its own error content — so the input marks
   * itself invalid if either says so. A control bound to signal forms has no
   * field wrapper to consult; a control inside a field may have no signal form.
   */
  readonly invalid = input<boolean>(false);

  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  /* ── TekadModelControl: the seam for @tekad/forms/compat ──────────────── */

  readonly model = this.value;
  readonly disabledByForm = signal(false);
  readonly effectivelyDisabled = computed(() => this.disabled() || this.disabledByForm());

  /* ── the field, if there is one ───────────────────────────────────────── */

  /**
   * Optional by design. An input outside a field must be a working input, not
   * a broken one — so this resolves to `null` and every binding that depends
   * on it falls back.
   */
  protected readonly field = inject(TEKAD_FIELD_CONTEXT, { optional: true });

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);

  /**
   * `"true"` or `null`, never `"false"`.
   *
   * `aria-invalid="false"` is valid and means "explicitly not invalid", which
   * is different from absent — but every control in a form emitting it adds
   * noise to the accessibility tree for no gain. Absent is the honest default.
   */
  protected readonly ariaInvalid = computed(() =>
    this.invalid() || this.field?.invalid() ? 'true' : null,
  );

  private readonly generatedId = uniqueId('tk-input');

  constructor() {
    // The one thing that travels control -> field: <label for> needs it, and
    // only the control knows whether the consumer supplied an id.
    this.field?.setControlId(this.resolvedId());
  }

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;
    // Read from the element. The platform has already decided what the value
    // is — after IME composition, after autofill, after a paste — and deriving
    // it again is how a control ends up disagreeing with the box the user is
    // looking at.
    this.value.set(el.value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
