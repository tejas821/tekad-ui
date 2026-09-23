import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * A brief label shown on hover/focus of a trigger element.
 *
 * This is a simplified tooltip that uses CSS positioning and the popover API.
 * The consumer applies `tkTooltip` directive to the trigger; the tooltip
 * content is projected.
 *
 * Uses `popover="manual"` so TEKAD owns the show/hide lifecycle.
 *
 * Accessible name: the tooltip sets `role="tooltip"` and the trigger
 * references it via `aria-describedby`.
 */
@Component({
  selector: 'tk-tooltip',
  standalone: true,
  template: `
    <div
      #popover
      class="tk-tooltip__bubble"
      role="tooltip"
      [id]="resolvedId()"
      popover="manual"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './tekad-tooltip.css',
  host: { class: 'tk-tooltip' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadTooltip {
  readonly id = input<string | undefined>(undefined);
  readonly position = input<'top' | 'bottom' | 'left' | 'right'>('top');

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);
  private readonly generatedId = uniqueId('tk-tooltip');
}
