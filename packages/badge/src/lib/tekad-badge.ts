import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TekadBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

/**
 * A small count or status indicator.
 *
 * Used standalone as a label (`<tk-badge>New</tk-badge>`) or overlaid on
 * another element as a dot/count notification.
 *
 * Tone is an input here (unlike button) because a badge IS a status indicator —
 * the colour IS the meaning, and the set is fixed by the design system.
 */
@Component({
  selector: 'tk-badge',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-badge.css',
  host: {
    class: 'tk-badge',
    '[class]': 'classes()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadBadge {
  readonly tone = input<TekadBadgeTone>('neutral');
  readonly dot = input<boolean>(false);

  protected readonly classes = computed(() =>
    `tk-badge tk-badge--${this.tone()}${this.dot() ? ' tk-badge--dot' : ''}`
  );
}
