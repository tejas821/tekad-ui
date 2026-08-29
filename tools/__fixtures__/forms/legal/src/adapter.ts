import { Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/**
 * A SEPARATE adapter class. This is the sanctioned shape (ADR-013): the CVA
 * lives in its own class, not bolted onto a signal-forms control.
 */
@Component({
  selector: 'tk-adapter',
  standalone: true,
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Adapter), multi: true }],
})
export class Adapter implements ControlValueAccessor {
  writeValue(_v: string): void {}
  registerOnChange(_fn: (v: string) => void): void {}
  registerOnTouched(_fn: () => void): void {}
}
