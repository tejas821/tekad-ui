/**
 * TEKAD SSR encapsulation probe.
 *
 * ADR-007 ends with an obligation, not a decision:
 *
 *   "Emulated-encapsulation SSR cost must be measured before Phase 9 (a 1,000-
 *    row table pays one `_ngcontent` attribute per element)."
 *
 * The claim in the parenthesis is true and says nothing about whether it
 * matters. `_ngcontent-ng-c123456789` is ~26 bytes, and a 1,000-row × 8-column
 * table is roughly 9,000 elements — so the raw HTML carries a couple of hundred
 * kilobytes of it. That number is the one people quote. It is also the one that
 * compresses best: every occurrence is the same string, which is the easiest
 * possible case for a compressor.
 *
 * So this renders the same markup three ways and reports raw, gzip and brotli
 * for each, because the decision rests on which of those numbers a consumer
 * actually pays.
 *
 * The three shapes, chosen because they are the three a table can have:
 *
 *   A. ONE component renders every element (default emulated encapsulation).
 *      Every element in that template carries `_ngcontent-<id>`.
 *
 *   B. The same component with `ViewEncapsulation.None`. No attributes at all.
 *      This is what TEKAD can afford, because ADR-007 decision 1 already puts
 *      every rule inside `@layer tekad.components` — the cascade layer, not
 *      attribute scoping, is what keeps consumer CSS winning.
 *
 *   C. A child component per cell, emulated. Each cell adds a `_nghost` on the
 *      host element as well as `_ngcontent` on what it renders. This is the
 *      shape a real `<tk-cell>` would have, and the one where the cost is
 *      supposed to bite.
 *
 * A and B are byte-identical apart from the attributes, so the difference
 * between them is the attribute cost and nothing else.
 */
import { Component, ViewEncapsulation, input, ChangeDetectionStrategy } from '@angular/core';

export interface Row {
  readonly id: number;
  readonly cells: readonly string[];
}

/** Deterministic, so two runs of this probe are comparable. */
export function makeRows(count: number, columns: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const cells: string[] = [];
    for (let c = 0; c < columns; c++) cells.push(`r${i}c${c}`);
    rows.push({ id: i, cells });
  }
  return rows;
}

/**
 * The styles are real rather than a placeholder: emulated encapsulation
 * rewrites selectors as well as adding attributes, and a probe with no styles
 * would not exercise that.
 */
const STYLES = `
  .tk-table { inline-size: 100%; border-collapse: collapse; }
  .tk-row { border-block-end: 1px solid var(--tekad-sys-color-outline); }
  .tk-cell { padding-inline: 0.75rem; padding-block: 0.5rem; text-align: start; }
`;

const TABLE_TEMPLATE = `
  <table class="tk-table">
    <tbody>
      @for (row of rows(); track row.id) {
        <tr class="tk-row">
          @for (cell of row.cells; track $index) {
            <td class="tk-cell">{{ cell }}</td>
          }
        </tr>
      }
    </tbody>
  </table>
`;

/** A — the default. One component, emulated encapsulation. */
@Component({
  selector: 'tk-table-emulated',
  standalone: true,
  template: TABLE_TEMPLATE,
  styles: STYLES,
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableEmulated {
  readonly rows = input.required<readonly Row[]>();
}

/** B — identical in every respect except encapsulation. */
@Component({
  selector: 'tk-table-none',
  standalone: true,
  template: TABLE_TEMPLATE,
  styles: STYLES,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableNone {
  readonly rows = input.required<readonly Row[]>();
}

/** C — a component per cell, which is where the cost is supposed to bite. */
@Component({
  selector: 'tk-cell',
  standalone: true,
  template: `<span class="tk-cell-text">{{ value() }}</span>`,
  styles: `
    .tk-cell-text {
      display: block;
    }
  `,
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellEmulated {
  readonly value = input.required<string>();
}

@Component({
  selector: 'tk-table-per-cell',
  standalone: true,
  imports: [CellEmulated],
  template: `
    <table class="tk-table">
      <tbody>
        @for (row of rows(); track row.id) {
          <tr class="tk-row">
            @for (cell of row.cells; track $index) {
              <td class="tk-cell"><tk-cell [value]="cell" /></td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: STYLES,
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablePerCell {
  readonly rows = input.required<readonly Row[]>();
}
