import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A table foundation.
 *
 * ADR-014: a cell is not a component. This is a thin directive that
 * decorates a native `<table>` with design tokens — no per-cell component
 * instances, which docs/architecture/15-ssr-encapsulation.md measured at
 * +51% brotli and 2.8x the elements.
 *
 * The consumer writes real `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`.
 * TEKAD provides the styling tokens and striped/bordered variants.
 */
@Component({
  selector: 'table[tkTable]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-table.css',
  host: {
    class: 'tk-table',
    '[class.tk-table--striped]': 'striped()',
    '[class.tk-table--bordered]': 'bordered()',
    '[class.tk-table--compact]': 'compact()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadTable {
  readonly striped = input<boolean>(false);
  readonly bordered = input<boolean>(false);
  readonly compact = input<boolean>(false);
}
