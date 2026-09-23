import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * An option within a `<tk-select>`.
 *
 * Wraps a native `<option>` — the component provides styling context.
 */
@Component({
  selector: 'tk-option',
  standalone: true,
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadOption {
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
}
