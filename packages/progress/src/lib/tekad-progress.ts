import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A progress bar.
 *
 * Uses the native `<progress>` element, decorated with design tokens.
 * Determinate when `value` is set; indeterminate when `value` is undefined.
 *
 * The platform provides the ARIA semantics: `role="progressbar"`,
 * `aria-valuenow`, `aria-valuemin`, `aria-valuemax` are all implicit on
 * `<progress>`.
 */
@Component({
  selector: 'tk-progress',
  standalone: true,
  template: `
    <progress
      class="tk-progress__bar"
      [attr.value]="value()"
      [attr.max]="max()"
      [attr.aria-label]="ariaLabel() || null"
    ></progress>
  `,
  styleUrl: './tekad-progress.css',
  host: {
    class: 'tk-progress',
    '[class.tk-progress--indeterminate]': 'value() == null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadProgress {
  readonly value = input<number | null>(null);
  readonly max = input<number>(100);
  readonly ariaLabel = input<string>('');
}
