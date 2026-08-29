import { Component, forwardRef, model, output, type ModelSignal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Never names ControlValueAccessor — but providing NG_VALUE_ACCESSOR registers
 * one all the same, and the signal-forms value model then never binds.
 */
@Component({
  selector: 'tk-sneaky',
  standalone: true,
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Sneaky), multi: true }],
})
export class Sneaky {
  readonly value: ModelSignal<string> = model<string>('');
  readonly touch = output<void>();
  writeValue(_v: string): void {}
}
