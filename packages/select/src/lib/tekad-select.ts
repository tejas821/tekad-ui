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
import { uniqueId } from '@tekad/core/primitives/identity';
import { provideTekadModelControl, type TekadModelControl } from '@tekad/core/forms/model-control';
import type { FormValueControl } from '@angular/forms/signals';
import { TEKAD_FIELD_CONTEXT } from '@tekad/core/forms/field-context';

/**
 * A select control.
 *
 * Decorates a native `<select>` element, keeping all platform behaviour:
 * keyboard navigation, form participation, autofill, and forced-colours.
 *
 * `FormValueControl<string>` — compatible with signal forms and
 * `@tekad/forms/compat` for Reactive Forms.
 */
@Component({
  selector: 'tk-select',
  standalone: true,
  template: `
    <select
      class="tk-select__native"
      [id]="resolvedId()"
      [disabled]="effectivelyDisabled()"
      [attr.aria-describedby]="field?.describedBy() ?? null"
      [attr.aria-invalid]="ariaInvalid()"
      (change)="onChange($event)"
      (blur)="onBlur()"
    >
      <ng-content />
    </select>
    <span class="tk-select__arrow" aria-hidden="true"></span>
  `,
  styleUrl: './tekad-select.css',
  providers: [provideTekadModelControl(TekadSelect)],
  host: {
    class: 'tk-select',
    '[attr.id]': 'hostId()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadSelect implements FormValueControl<string>, TekadModelControl<string> {
  readonly value: ModelSignal<string> = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly id = input<string | undefined>(undefined);
  readonly touch = output<void>();
  readonly touched = input<boolean>(false);

  readonly model = this.value;
  readonly disabledByForm = signal(false);
  readonly effectivelyDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly field = inject(TEKAD_FIELD_CONTEXT, { optional: true });
  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);
  protected readonly hostId = computed(() => `${this.resolvedId()}-host`);
  protected readonly ariaInvalid = computed(() =>
    this.invalid() || this.field?.invalid() ? 'true' : null,
  );

  private readonly generatedId = uniqueId('tk-select');

  constructor() {
    this.field?.setControlId(this.resolvedId());
  }

  protected onChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (!el) return;
    this.value.set(el.value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
