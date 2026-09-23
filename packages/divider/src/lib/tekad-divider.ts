import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A visual separator.
 *
 * Renders a real `<hr>` — the platform's semantic separator. The component
 * decorates it with design tokens rather than replacing it with a `<div>`.
 *
 * `role="separator"` is implicit on `<hr>`; `aria-orientation` is set when
 * vertical.
 */
@Component({
  selector: 'tk-divider',
  standalone: true,
  template: '',
  styleUrl: './tekad-divider.css',
  host: {
    '[attr.aria-orientation]': 'orientation() === "vertical" ? "vertical" : null',
    '[class]': '"tk-divider tk-divider--" + orientation()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadDivider {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
