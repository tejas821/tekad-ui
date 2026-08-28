/**
 * TEKAD P1 — does @angular/aria's ngGridCell register correctly under the real
 * Angular rendering paths TEKAD would use?
 *
 * Gates ADR-014 (four-layer table architecture, TEKAD owns the rendering layer).
 *
 * Engine: Chromium (Playwright). Firefox/Gecko and Safari are NOT executed here
 * and remain UNVERIFIED — DI registration is framework-level, not engine-level,
 * but that is an inference and is labelled as such, never as observed.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'gridprobe/dist/gridprobe/browser');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.css': 'text/css', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  let name = (req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html';
  let file = join(DIST, name);
  if (!existsSync(file)) file = join(DIST, 'index.html');       // SPA fallback
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(String(e.message || e)));

await page.goto(URL_);
await page.waitForFunction(() => window.P1_READY === true, null, { timeout: 30000 });

const P = (js) => page.evaluate(js);
const snap = async () => JSON.parse(await P('JSON.stringify(window.P1.snapshot())'));
const errs = async () => JSON.parse(await P('JSON.stringify(window.P1.errors())'));

/* --------------------------------------------------------------------------
 * One scenario: render, verify DI registration + ARIA wiring, then keyboard,
 * then dynamic add/remove.
 * ------------------------------------------------------------------------ */
async function runScenario(name, { rows = 3, cols = 4, expectFailure = false } = {}) {
  // TEST ISOLATION: an NG0201 thrown during change detection leaves the Angular
  // view in an inconsistent state and contaminates the NEXT scenario. Reload to
  // guarantee a clean application instance per scenario.
  await page.goto(URL_);
  await page.waitForFunction(() => window.P1_READY === true, null, { timeout: 30000 });
  consoleErrors.length = 0; pageErrors.length = 0;
  // Scenario switching can throw synchronously (that is the point of the
  // cdk-table control), so capture rather than propagate.
  const switchResult = await P(`(() => { try {
      window.P1.setScenario(${JSON.stringify(name)}, { rows: ${rows}, cols: ${cols} });
      return JSON.stringify({ ok: true });
    } catch (e) { return JSON.stringify({ ok: false, error: String(e && e.message || e) }); } })()`);
  const switched = JSON.parse(switchResult);
  await sleep(400);

  const initial = await snap();
  const angularErrors = await errs();
  if (!switched.ok) angularErrors.push('SYNC THROW during scenario switch: ' + switched.error);
  const ng0201 = [...angularErrors, ...consoleErrors, ...pageErrors]
    .filter(e => /NG0201|No provider found|GRID_ROW/i.test(e));

  const expectedCells = rows * cols;
  const registered = initial.present && initial.rowCount === rows && initial.cellCount === expectedCells;

  // ARIA wiring: every cell must carry role + both index attributes.
  const ariaOk = registered && initial.cells.every(c =>
    c.role === 'gridcell' && c.ariaRowIndex !== null && c.ariaColIndex !== null);

  /* -------- keyboard: roving focus must move across the real DOM -------- */
  let keyboard = { attempted: false };
  if (registered) {
    await P('window.P1.focusFirstCell()');
    await sleep(120);
    const atStart = await snap();
    await P("window.P1.key('ArrowRight')"); await sleep(120);
    const afterRight = await snap();
    await P("window.P1.key('ArrowDown')"); await sleep(120);
    const afterDown = await snap();
    keyboard = {
      attempted: true,
      startActive: atStart.activeCellText,
      afterArrowRight: afterRight.activeCellText,
      afterArrowDown: afterDown.activeCellText,
      movedRight: !!afterRight.activeCellText && afterRight.activeCellText !== atStart.activeCellText,
      movedDown: !!afterDown.activeCellText && afterDown.activeCellText !== afterRight.activeCellText,
    };
  }

  /* -------- dynamic rows: add and remove at runtime -------- */
  let dynamic = { attempted: false, notApplicable: name === 'static',
                  reason: name === 'static' ? 'the static control renders hand-written rows, not data' : undefined };
  if (registered && name !== 'static') {
    await P('window.P1.addRow()'); await sleep(300);
    const afterAdd = await snap();
    await P('window.P1.addRow(0)'); await sleep(300);       // insert at the top
    const afterInsertTop = await snap();
    await P('window.P1.removeRow(1)'); await sleep(300);
    const afterRemove = await snap();
    const dynErrors = (await errs()).filter(e => /NG0201|No provider found|GRID_ROW/i.test(e));

    const idxContiguous = (s) => s.cells.every((c, i) => {
      const r = Math.floor(i / cols), col = i % cols;
      return c.ariaRowIndex === String(r) && c.ariaColIndex === String(col);
    });

    dynamic = {
      attempted: true,
      afterAppendRowCount: afterAdd.rowCount,
      afterAppendCellCount: afterAdd.cellCount,
      afterInsertTopRowCount: afterInsertTop.rowCount,
      afterRemoveRowCount: afterRemove.rowCount,
      afterRemoveCellCount: afterRemove.cellCount,
      appendedCorrectly: afterAdd.rowCount === rows + 1 && afterAdd.cellCount === (rows + 1) * cols,
      insertedCorrectly: afterInsertTop.rowCount === rows + 2,
      removedCorrectly: afterRemove.rowCount === rows + 1 && afterRemove.cellCount === (rows + 1) * cols,
      indicesReindexedAfterMutation: idxContiguous(afterRemove),
      noErrorsDuringMutation: dynErrors.length === 0,
    };
  }

  const pass = expectFailure
    ? (ng0201.length > 0 || !registered)
    : (ng0201.length === 0 && registered && ariaOk
       && keyboard.movedRight && keyboard.movedDown
       && (dynamic.notApplicable || (dynamic.appendedCorrectly && dynamic.insertedCorrectly
           && dynamic.removedCorrectly && dynamic.indicesReindexedAfterMutation
           && dynamic.noErrorsDuringMutation)));

  return {
    scenario: name,
    expectation: expectFailure ? 'EXPECTED TO FAIL (control)' : 'expected to work',
    verdict: pass ? 'PASS' : 'FAIL',
    diRegistration: {
      gridRendered: initial.present,
      rowsRegistered: initial.rowCount,
      cellsRegistered: initial.cellCount,
      expectedRows: rows, expectedCells,
      ng0201Errors: ng0201,
      otherAngularErrors: angularErrors.filter(e => !/NG0201|No provider found|GRID_ROW/i.test(e)),
    },
    ariaWiring: {
      gridRole: initial.gridRole,
      allCellsHaveRoleAndIndices: ariaOk,
      sampleCells: initial.cells.slice(0, 3),
      sampleRows: initial.rows.slice(0, 3),
    },
    keyboard,
    dynamicRows: dynamic,
  };
}

/* --------------------------------- run ---------------------------------- */
const results = {};
results.static = await runScenario('static', { rows: 2, cols: 2 });
results.for = await runScenario('for');
results.templateOutlet = await runScenario('templateOutlet');
results.contentProjection = await runScenario('contentProjection');
results.viewContainer = await runScenario('viewContainer');
results.templateOutletInside = await runScenario('templateOutletInside');
results.consumerTemplate = await runScenario('consumerTemplate');
results.consumerTemplateWithInjector = await runScenario('consumerTemplateWithInjector');
results.widget = await runScenario('widget');
results.cdkTable = await runScenario('cdkTable', { expectFailure: true });

await browser.close();
server.close();

const out = {
  generatedAt: new Date().toISOString(),
  purpose: 'P1 — @angular/aria ngGridCell registration under real Angular rendering paths',
  gates: 'ADR-014 (table architecture)',
  engineScope: {
    chromium: 'executed',
    firefox: 'NOT EXECUTED — UNVERIFIED',
    safari: 'NOT EXECUTED — UNVERIFIED',
    note: 'DI registration is an Angular framework concern rather than an engine concern, '
        + 'but that is an INFERENCE and is not reported as observed cross-engine behaviour.',
  },
  results,
};
writeFileSync(join(HERE, 'p1-results.json'), JSON.stringify(out, null, 2));

console.log('\n' + '='.repeat(76));
for (const [k, r] of Object.entries(results)) {
  console.log(`${r.verdict.padEnd(5)} ${k.padEnd(18)} rows=${r.diRegistration.rowsRegistered}/${r.diRegistration.expectedRows} cells=${r.diRegistration.cellsRegistered}/${r.diRegistration.expectedCells} ng0201=${r.diRegistration.ng0201Errors.length} aria=${r.ariaWiring.allCellsHaveRoleAndIndices} kbd=${r.keyboard.movedRight === true && r.keyboard.movedDown === true} dyn=${r.dynamicRows.attempted ? r.dynamicRows.indicesReindexedAfterMutation : 'n/a'}  [${r.expectation}]`);
}
