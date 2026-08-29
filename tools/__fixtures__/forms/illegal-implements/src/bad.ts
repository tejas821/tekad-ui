import { Component, model, output, type ModelSignal } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';

@Component({ selector: 'tk-bad', standalone: true, template: '' })
export class BadControl implements FormValueControl<string>, ControlValueAccessor {
  readonly value: ModelSignal<string> = model<string>('');
  readonly touch = output<void>();
  writeValue(_v: string): void {}
  registerOnChange(_fn: (v: string) => void): void {}
  registerOnTouched(_fn: () => void): void {}
}
