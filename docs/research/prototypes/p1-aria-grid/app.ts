/**
 * TEKAD P1 probe — does @angular/aria's ngGridCell register correctly under
 * the REAL Angular rendering paths TEKAD would use?
 *
 * Known hazard: angular/components#32603 — ngGridCell throws NG0201
 * "No provider found for GRID_ROW" inside cdk-table, because CDK's portal
 * rendering severs the DI tree between row and cell. GridCell injects its
 * parent GridRow, so any rendering path that breaks that injector chain fails.
 *
 * Scenarios cover: static (control), @for, @for with ngTemplateOutlet,
 * content projection, ViewContainerRef-created rows, dynamic add/remove,
 * cell widgets, and cdk-table (control — expected to fail).
 */
import {
  Component, ErrorHandler, Injectable, signal, computed,
  ViewChild, ViewContainerRef, TemplateRef, AfterViewInit, ChangeDetectorRef, inject, input,
  Directive, Injector,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Grid, GridRow, GridCell, GridCellWidget } from '@angular/aria/grid';
import { CdkTableModule } from '@angular/cdk/table';

/* ---------------------------------------------------------------------------
 * Error capture. Angular errors must be recorded rather than killing the app,
 * so the cdk-table control scenario can fail without taking the probe down.
 * ------------------------------------------------------------------------- */
export const P1_ERRORS: string[] = [];

@Injectable()
export class RecordingErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const msg = String(error?.message ?? error);
    P1_ERRORS.push(msg);
    // eslint-disable-next-line no-console
    console.error('[P1]', msg);
  }
}

export interface Cell { value: string; disabled?: boolean; }
export interface Row { id: number; cells: Cell[]; }

let nextRowId = 1;
const makeRow = (cols = 4): Row => ({
  id: nextRowId,
  cells: Array.from({ length: cols }, (_, c) => ({ value: `r${nextRowId}c${c}` })),
});
const makeRows = (n: number, cols = 4): Row[] => {
  nextRowId = 1;
  return Array.from({ length: n }, () => { const r = makeRow(cols); nextRowId++; return r; });
};

/* Captures the Injector at its host's position in the template, so an
   embedded view can be given the INSERTION-site injector instead of inheriting
   its declaration-site one. This is the candidate remedy for consumer-supplied
   cell templates. */
@Directive({ selector: '[captureInjector]', standalone: true, exportAs: 'captureInjector' })
export class CaptureInjector { readonly injector = inject(Injector); }

/* Supplies a cell TemplateRef from a SEPARATE component — i.e. declared in the
   consumer's template, exactly as a real TEKAD column API would be used. */
@Component({
  selector: 'consumer-columns',
  standalone: true,
  template: `
    <ng-template #cellTpl let-cell let-ri="ri" let-ci="ci">
      <td ngGridCell [rowIndex]="ri" [colIndex]="ci">{{ cell.value }}</td>
    </ng-template>`,
  imports: [GridCell],
})
export class ConsumerColumns {
  @ViewChild('cellTpl', { static: true }) cellTpl!: TemplateRef<any>;
}

/* Child component used by the content-projection scenario: the cells are
   authored in the PARENT template and projected through this component, so the
   DI chain must survive a component boundary. */
@Component({
  selector: 'projected-row',
  standalone: true,
  template: `<tr ngGridRow [rowIndex]="rowIndex()"><ng-content /></tr>`,
  imports: [GridRow],
})
export class ProjectedRow {
  readonly rowIndex = input(0);
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Grid, GridRow, GridCell, GridCellWidget, NgTemplateOutlet, CdkTableModule, ProjectedRow,
            CaptureInjector, ConsumerColumns],
  template: `
<h1>P1 grid probe — scenario: {{ scenario() }}</h1>

<!-- 1. STATIC (control): hand-written rows and cells -->
@if (scenario() === 'static') {
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    <tr ngGridRow [rowIndex]="0">
      <td ngGridCell [rowIndex]="0" [colIndex]="0">a0</td>
      <td ngGridCell [rowIndex]="0" [colIndex]="1">a1</td>
    </tr>
    <tr ngGridRow [rowIndex]="1">
      <td ngGridCell [rowIndex]="1" [colIndex]="0">b0</td>
      <td ngGridCell [rowIndex]="1" [colIndex]="1">b1</td>
    </tr>
  </table>
}

<!-- 2. @for rows x @for cells — the real rendering path -->
@if (scenario() === 'for') {
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <tr ngGridRow [rowIndex]="ri">
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <td ngGridCell [rowIndex]="ri" [colIndex]="ci" [disabled]="!!cell.disabled">{{ cell.value }}</td>
        }
      </tr>
    }
  </table>
}

<!-- 3. ngTemplateOutlet — embedded views, the closest analogue to portal rendering -->
@if (scenario() === 'templateOutlet') {
  <ng-template #rowTpl let-row let-ri="ri">
    <tr ngGridRow [rowIndex]="ri">
      @for (cell of row.cells; track cell.value; let ci = $index) {
        <ng-container *ngTemplateOutlet="cellTpl; context: { $implicit: cell, ri: ri, ci: ci }" />
      }
    </tr>
  </ng-template>
  <ng-template #cellTpl let-cell let-ri="ri" let-ci="ci">
    <td ngGridCell [rowIndex]="ri" [colIndex]="ci">{{ cell.value }}</td>
  </ng-template>

  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: row, ri: ri }" />
    }
  </table>
}

<!-- 4. Content projection across a component boundary -->
@if (scenario() === 'contentProjection') {
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <projected-row [rowIndex]="ri">
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <td ngGridCell [rowIndex]="ri" [colIndex]="ci">{{ cell.value }}</td>
        }
      </projected-row>
    }
  </table>
}

<!-- 5. ViewContainerRef.createEmbeddedView — imperative, most portal-like -->
@if (scenario() === 'viewContainer') {
  <ng-template #vcRowTpl let-row let-ri="ri">
    <tr ngGridRow [rowIndex]="ri">
      @for (cell of row.cells; track cell.value; let ci = $index) {
        <td ngGridCell [rowIndex]="ri" [colIndex]="ci">{{ cell.value }}</td>
      }
    </tr>
  </ng-template>
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    <ng-container #vcHost />
  </table>
}

<!-- 6. Cell widgets inside @for -->
@if (scenario() === 'widget') {
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <tr ngGridRow [rowIndex]="ri">
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <td ngGridCell [rowIndex]="ri" [colIndex]="ci">
            <button ngGridCellWidget widgetType="simple">{{ cell.value }}</button>
          </td>
        }
      </tr>
    }
  </table>
}

<!-- 8. ngTemplateOutlet with the template DECLARED INSIDE the row -->
@if (scenario() === 'templateOutletInside') {
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <tr ngGridRow [rowIndex]="ri">
        <ng-template #innerCellTpl let-cell let-ci="ci">
          <td ngGridCell [rowIndex]="ri" [colIndex]="ci">{{ cell.value }}</td>
        </ng-template>
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <ng-container *ngTemplateOutlet="innerCellTpl; context: { $implicit: cell, ci: ci }" />
        }
      </tr>
    }
  </table>
}

<!-- 9. CONSUMER-SUPPLIED template (declared in another component) -->
@if (scenario() === 'consumerTemplate') {
  <consumer-columns #cc />
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <tr ngGridRow [rowIndex]="ri">
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <ng-container *ngTemplateOutlet="cc.cellTpl; context: { $implicit: cell, ri: ri, ci: ci }" />
        }
      </tr>
    }
  </table>
}

<!-- 10. CONSUMER-SUPPLIED template + INSERTION-site injector (candidate remedy) -->
@if (scenario() === 'consumerTemplateWithInjector') {
  <consumer-columns #cc2 />
  <table ngGrid id="grid" [focusMode]="focusMode()" [enableSelection]="true">
    @for (row of rows(); track row.id; let ri = $index) {
      <tr ngGridRow [rowIndex]="ri" captureInjector #inj="captureInjector">
        @for (cell of row.cells; track cell.value; let ci = $index) {
          <ng-container *ngTemplateOutlet="cc2.cellTpl;
                        context: { $implicit: cell, ri: ri, ci: ci };
                        injector: inj.injector" />
        }
      </tr>
    }
  </table>
}

<!-- 7. cdk-table CONTROL — expected to reproduce NG0201 (#32603) -->
@if (scenario() === 'cdkTable') {
  <cdk-table ngGrid id="grid" [dataSource]="rows()">
    @for (col of columnIds; track col; let ci = $index) {
      <ng-container [cdkColumnDef]="col">
        <cdk-header-cell *cdkHeaderCellDef>{{ col }}</cdk-header-cell>
        <cdk-cell *cdkCellDef="let row" ngGridCell [colIndex]="ci">{{ row.cells[ci].value }}</cdk-cell>
      </ng-container>
    }
    <cdk-header-row *cdkHeaderRowDef="columnIds"></cdk-header-row>
    <cdk-row *cdkRowDef="let row; columns: columnIds" ngGridRow></cdk-row>
  </cdk-table>
}
`,
})
export class App implements AfterViewInit {
  private cdr = inject(ChangeDetectorRef);

  scenario = signal<string>('for');
  focusMode = signal<'roving' | 'activedescendant'>('roving');
  rows = signal<Row[]>(makeRows(3));
  columnIds = ['c0', 'c1', 'c2', 'c3'];

  @ViewChild('vcHost', { read: ViewContainerRef }) vcHost?: ViewContainerRef;
  @ViewChild('vcRowTpl') vcRowTpl?: TemplateRef<any>;

  ngAfterViewInit(): void {
    this.renderViewContainerRows();
    (window as any).P1 = this.api();
    (window as any).P1_READY = true;
  }

  private renderViewContainerRows(): void {
    if (this.scenario() !== 'viewContainer' || !this.vcHost || !this.vcRowTpl) return;
    this.vcHost.clear();
    this.rows().forEach((row, ri) =>
      this.vcHost!.createEmbeddedView(this.vcRowTpl!, { $implicit: row, ri }));
    this.cdr.detectChanges();
  }

  private api() {
    return {
      errors: () => [...P1_ERRORS],
      clearErrors: () => { P1_ERRORS.length = 0; return 1; },

      setScenario: (name: string, opts: any = {}) => {
        P1_ERRORS.length = 0;
        this.focusMode.set(opts.focusMode ?? 'roving');
        this.rows.set(makeRows(opts.rows ?? 3, opts.cols ?? 4));
        this.scenario.set(name);
        this.cdr.detectChanges();
        setTimeout(() => this.renderViewContainerRows());
        return 1;
      },

      addRow: (at?: number) => {
        const next = [...this.rows()];
        nextRowId = Math.max(0, ...next.map(r => r.id)) + 1;
        const row = makeRow(next[0]?.cells.length ?? 4);
        if (at === undefined) next.push(row); else next.splice(at, 0, row);
        this.rows.set(next);
        this.cdr.detectChanges();
        this.renderViewContainerRows();
        return 1;
      },

      removeRow: (at: number) => {
        const next = [...this.rows()];
        next.splice(at, 1);
        this.rows.set(next);
        this.cdr.detectChanges();
        this.renderViewContainerRows();
        return 1;
      },

      /** Structural read of what actually reached the DOM. */
      snapshot: () => {
        const grid = document.getElementById('grid');
        if (!grid) return { present: false };
        const rowEls = Array.from(grid.querySelectorAll('[role="row"]'));
        const cellEls = Array.from(grid.querySelectorAll('[role="gridcell"],[role="columnheader"],[role="rowheader"]'));
        const active = grid.querySelector('[data-active="true"]') as HTMLElement | null;
        return {
          present: true,
          gridRole: grid.getAttribute('role'),
          gridTabIndex: grid.getAttribute('tabindex'),
          ariaActiveDescendant: grid.getAttribute('aria-activedescendant'),
          rowCount: rowEls.length,
          cellCount: cellEls.length,
          rows: rowEls.map(r => ({
            role: r.getAttribute('role'),
            ariaRowIndex: r.getAttribute('aria-rowindex'),
          })),
          cells: cellEls.map(c => ({
            role: c.getAttribute('role'),
            id: c.getAttribute('id'),
            ariaRowIndex: c.getAttribute('aria-rowindex'),
            ariaColIndex: c.getAttribute('aria-colindex'),
            tabindex: c.getAttribute('tabindex'),
            dataActive: c.getAttribute('data-active'),
            text: (c.textContent || '').trim(),
          })),
          activeCellText: active ? (active.textContent || '').trim() : null,
          activeCellId: active ? active.getAttribute('id') : null,
          focusedElementText: document.activeElement
            ? (document.activeElement.textContent || '').trim().slice(0, 24) : null,
        };
      },

      focusFirstCell: () => {
        const grid = document.getElementById('grid');
        const first = grid?.querySelector('[role="gridcell"]') as HTMLElement | null;
        if (!first) return 0;
        first.focus();
        return 1;
      },

      key: (key: string, mods: any = {}) => {
        const grid = document.getElementById('grid');
        const target = (document.activeElement && grid?.contains(document.activeElement))
          ? document.activeElement : grid;
        target?.dispatchEvent(new KeyboardEvent('keydown', {
          key, bubbles: true, cancelable: true,
          ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, metaKey: !!mods.meta,
        }));
        return 1;
      },
    };
  }
}
