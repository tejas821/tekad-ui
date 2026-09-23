import { ChangeDetectionStrategy, Component, computed, input, model, output, signal, type ModelSignal } from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * A toggle switch.
 *
 * Uses a native `<input type="checkbox">` under the hood — it IS a checkbox
 * semantically. The visual "switch" is painted over it, exactly like the
 * checkbox component.
 *
 * `role="switch"` is set on the input because WCAG and ARIA 1.2 recognise
 * it as an acceptable enhancement of checkbox semantics for toggle controls.
 */
@Component({
  selector: 'tk-switch',
  standalone: true,
  template: `
    <label class="tk-switch__label">
      <input
        #input
        class="tk-switch__input"
        type="checkbox"
        role="switch"
        [id]="inputId()"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="onChange($event)"
        (blur)="onBlur()"
      />
      <span class="tk-switch__track" aria-hidden="true">
        <span class="tk-switch__thumb"></span>
      </span>
      <span class="tk-switch__text"><ng-content /></span>
    </label>
  `,
  styleUrl: './tekad-switch.css',
  host: { class: 'tk-switch', '[attr.id]': 'resolvedId()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadSwitch {
  readonly checked: ModelSignal<boolean> = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string | undefined>(undefined);
  readonly touch = output<void>();

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);
  protected readonly inputId = computed(() => `${this.resolvedId()}-input`);
  private readonly generatedId = uniqueId('tk-switch');

  protected onChange(event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;
    this.checked.set(el.checked);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
