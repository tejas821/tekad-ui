import { model, output, type ModelSignal } from '@angular/core';
import { Component } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/** A signal-forms control. No CVA anywhere near it. */
@Component({ selector: 'tk-ok', standalone: true, template: '' })
export class OkControl implements FormValueControl<string> {
  readonly value: ModelSignal<string> = model<string>('');
  readonly touch = output<void>();
}
