import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A content container.
 *
 * Semantic: a `<section>` with an optional accessible name from the heading.
 * Projects header, body and footer via named slots.
 */
@Component({
  selector: 'tk-card',
  standalone: true,
  template: `
    <div class="tk-card__header">
      <ng-content select="[tkCardHeader]" />
    </div>
    <div class="tk-card__body">
      <ng-content />
    </div>
    <div class="tk-card__footer">
      <ng-content select="[tkCardFooter]" />
    </div>
  `,
  styleUrl: './tekad-card.css',
  host: { class: 'tk-card' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadCard {}
