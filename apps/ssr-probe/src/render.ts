/**
 * Renders each probe shape to SSR HTML and writes it to disk for
 * `tools/verify-ssr-encapsulation.mjs` to measure.
 *
 * Rendering and measuring are separate steps on purpose. The render needs the
 * AOT-compiled components and a server platform; the measurement needs neither,
 * and keeping it in a plain script means the gate's own self-test can run
 * against fixture HTML without booting Angular.
 */
/**
 * Loaded FIRST, and only because this probe runs outside the Angular build
 * pipeline. Angular's own packages ship PARTIALLY compiled and expect the
 * Angular Linker — which `@angular/build` runs and a bare `node` invocation
 * does not. Importing the compiler lets those library declarations link at
 * runtime.
 *
 * It does NOT weaken the measurement. The probe's own components were compiled
 * by `ngc` in FULL mode, so their component definitions — including the
 * `encapsulation` setting and the generated style scope — are exactly the AOT
 * output a consumer's application produces. What the renderer writes into the
 * SSR HTML is read from those definitions.
 */
import '@angular/compiler';

import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeRows, TableEmulated, TableNone, TablePerCell, type Row } from './probe.js';

const ROWS = Number(process.env['TEKAD_SSR_ROWS'] ?? 1000);
const COLUMNS = Number(process.env['TEKAD_SSR_COLUMNS'] ?? 8);
const OUT = process.env['TEKAD_SSR_OUT'] ?? 'dist/ssr-probe';

const rows: readonly Row[] = makeRows(ROWS, COLUMNS);

/**
 * The hosts hold the data themselves rather than taking an input: a
 * bootstrapped root component has no template to bind one from, and a required
 * input on a root throws NG0950 on the server.
 */
@Component({
  selector: 'tk-host-emulated',
  standalone: true,
  imports: [TableEmulated],
  template: `<tk-table-emulated [rows]="rows" />`,
})
class HostEmulated {
  readonly rows = rows;
}

@Component({
  selector: 'tk-host-none',
  standalone: true,
  imports: [TableNone],
  template: `<tk-table-none [rows]="rows" />`,
})
class HostNone {
  readonly rows = rows;
}

@Component({
  selector: 'tk-host-per-cell',
  standalone: true,
  imports: [TablePerCell],
  template: `<tk-table-per-cell [rows]="rows" />`,
})
class HostPerCell {
  readonly rows = rows;
}

const SHAPES = [
  { name: 'emulated', selector: 'tk-host-emulated', cmp: HostEmulated },
  { name: 'none', selector: 'tk-host-none', cmp: HostNone },
  { name: 'per-cell', selector: 'tk-host-per-cell', cmp: HostPerCell },
] as const;

mkdirSync(OUT, { recursive: true });

for (const shape of SHAPES) {
  const document = `<!doctype html><html><head></head><body><${shape.selector} /></body></html>`;
  // Angular 22 hands the bootstrap function a BootstrapContext that must be
  // forwarded; without it bootstrapApplication throws NG0401 on the server.
  const html = await renderApplication(
    (context) => bootstrapApplication(shape.cmp, { providers: [] }, context),
    { document },
  );
  writeFileSync(join(OUT, `${shape.name}.html`), html);
  console.log(`rendered ${shape.name}: ${html.length} bytes`);
}

writeFileSync(
  join(OUT, 'meta.json'),
  JSON.stringify({ rows: ROWS, columns: COLUMNS, elements: ROWS * COLUMNS }, null, 2),
);
