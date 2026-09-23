import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * An inline SVG icon.
 *
 * The consumer provides the SVG markup as projected content; TEKAD provides
 * the sizing, color inheritance, and accessibility semantics. This avoids
 * shipping an icon set (which is an opinion) while keeping a consistent
 * integration surface.
 *
 * `<tk-icon aria-label="Settings"><svg>...</svg></tk-icon>`
 *
 * Icons that are decorative (purely visual) should set `aria-hidden="true"`.
 * Icons that communicate meaning need `aria-label` or `aria-labelledby`.
 */
@Component({
  selector: 'tk-icon',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-icon.css',
  host: {
    class: 'tk-icon',
    '[style.--tekad-icon-size]': 'size()',
    role: 'img',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-hidden]': 'ariaHidden() ? "true" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadIcon {
  /** The rendered size. Defaults to 1em so it scales with surrounding text. */
  readonly size = input<string>('1em');

  /** Accessible label. Required unless the icon is decorative. */
  readonly ariaLabel = input<string>('');

  /** Set to true for purely decorative icons. */
  readonly ariaHidden = input<boolean>(false);
}
