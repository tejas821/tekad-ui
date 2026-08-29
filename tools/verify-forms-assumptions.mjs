#!/usr/bin/env node
/**
 * TEKAD — what Angular ACTUALLY does when a control implements both
 * `ControlValueAccessor` and `FormValueControl`.
 *
 * ADR-013 states it plainly:
 *
 *   "Angular explicitly forbids implementing both `ControlValueAccessor` and
 *    `FormValueControl` on the same component."
 *
 * The whole shape of Phase 7 rests on that sentence: it is why reactive-forms
 * support ships as a separate `@tekad/forms/compat` entry point rather than as
 * a second interface bolted onto every control.
 *
 * Reading `@angular/forms` 22.1.4 tells a different story. `FormField`'s
 * `ɵngControlCreate` resolves like this:
 *
 *     if (this.controlValueAccessor)        -> cvaControlCreate
 *     else if (host.customControl)          -> customControlCreate
 *     else if (elementIsNativeFormElement)  -> nativeControlCreate
 *     else                                  -> throw NG1914
 *
 * Nothing rejects a host that satisfies more than one. So this runs the
 * configuration in a real browser and records what happens, because the
 * difference matters:
 *
 *   If Angular THROWS, the compiler or runtime protects TEKAD and a lint rule
 *   would be belt-and-braces.
 *
 *   If Angular silently PREFERS the CVA, then a control implementing both
 *   compiles, runs, and quietly ignores its signal-forms contract — no error,
 *   no warning, the `value` model simply never binds. That is a worse failure
 *   than a prohibition, and a lint rule becomes the only thing standing between
 *   TEKAD and a control that looks correct and is not.
 *
 * A control implementing ONLY the signal-forms contract runs in the same page.
 * Without it, "the value did not bind" would prove nothing.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/forms-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-forms-assumptions: ${DIST} missing. Run \`nx build forms-probe\`.`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
};
const server = createServer((req, res) => {
  const name = (req.url ?? '/').split('?')[0]?.replace(/^\//, '') || 'index.html';
  let file = join(DIST, name);
  if (!existsSync(file)) file = join(DIST, 'index.html');
  try {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end('nf');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const addr = server.address();
const URL_ = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/`;

const exe = process.env['TEKAD_CHROMIUM'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
const page = await browser.newPage();

/** @type {string[]} */
const consoleErrors = [];
/** @type {string[]} */
const pageErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e)));

await page.goto(URL_);
await page.waitForFunction(() => window.TEKAD_FORMS_READY === true, null, { timeout: 30000 });

let failed = 0;
/**
 * @param {string} name
 * @param {boolean} pass
 * @param {string} [detail]
 */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

console.log('@angular/forms 22.1.4 — what happens with BOTH contracts on one control\n');

const bootErrors = await page.evaluate(() => window.tekadProbe?.errors() ?? []);
const ng1914 = [...consoleErrors, ...pageErrors, ...bootErrors].filter((e) =>
  /NG1914|invalid \[formField\]|forbid|not allowed/i.test(e),
);

/* -- 1. did anything reject the configuration at all? ---------------------- */
console.log(`  boot errors: ${bootErrors.length}`);
console.log(`  console errors: ${consoleErrors.length}, page errors: ${pageErrors.length}`);
if (consoleErrors.length)
  for (const e of consoleErrors.slice(0, 3)) console.log(`    ${e.slice(0, 160)}`);

const rejected = bootErrors.length > 0 || ng1914.length > 0;
console.log(
  `\n  Angular ${rejected ? 'REJECTED' : 'ACCEPTED'} a component implementing both contracts.`,
);

/* -- 2. THE CONTROL: the signal-forms-only control must bind --------------- */
await page.evaluate(() => window.tekadProbe?.setSignalOnly('changed-signal'));
await page.waitForTimeout(80);
const afterSignal = await page.evaluate(() => window.tekadProbe?.readModel());
check(
  'CONTROL: a signal-forms-only control DOES bind its value model',
  afterSignal?.signalOnly === 'changed-signal',
  `rendered "${afterSignal?.signalOnly}"`,
);

/* -- 3. the both-contracts control ----------------------------------------- */
await page.evaluate(() => window.tekadProbe?.setBoth('changed-both'));
await page.waitForTimeout(80);
const afterBoth = await page.evaluate(() => window.tekadProbe?.readModel());
const cva = await page.evaluate(() => window.tekadProbe?.readCva());

console.log('');
console.log(`  both-contracts control rendered: "${afterBoth?.both}"`);
console.log(
  `  its ControlValueAccessor.writeValue was called ${cva?.writeValueCalls} time(s), last "${cva?.lastWritten}"`,
);

const signalContractUsed = afterBoth?.both === 'changed-both';
const cvaUsed = (cva?.writeValueCalls ?? 0) > 0;

console.log('');
if (rejected) {
  check(
    'ADR-013 as written: Angular forbids the combination',
    true,
    'the configuration was rejected',
  );
} else if (cvaUsed && !signalContractUsed) {
  console.log('  ► MEASURED: Angular does NOT forbid this. It SILENTLY PREFERS the CVA,');
  console.log('    and the FormValueControl contract is never used. No error, no warning —');
  console.log('    the value model simply never binds.');
  console.log('');
  check('the CVA won', cvaUsed, `writeValue called ${cva?.writeValueCalls}x`);
  check(
    'and the signal-forms value model was silently ignored',
    !signalContractUsed,
    `rendered "${afterBoth?.both}" instead of "changed-both"`,
  );
} else if (signalContractUsed && !cvaUsed) {
  console.log('  ► MEASURED: the signal-forms contract won and the CVA was ignored.');
  check('the signal contract bound', signalContractUsed);
} else if (signalContractUsed && cvaUsed) {
  console.log('  ► MEASURED: BOTH were driven. This is the worst case — two bindings on');
  console.log('    one control, which is exactly the dual source of truth ADR-002 forbids.');
  failed++;
} else {
  console.log('  ► MEASURED: neither contract bound. The control is inert.');
  failed++;
}

await browser.close();
server.close();

console.log('');
console.log('  WHAT THIS MEANS FOR TEKAD, either way: the separate @tekad/forms/compat');
console.log('  entry point stands. What changes is WHY — if the framework does not');
console.log('  reject the combination, the TEKAD lint rule is not belt-and-braces, it is');
console.log('  the only thing that catches a control which looks correct and is not.');

if (failed > 0) {
  console.error(`\n${failed} forms assumption check(s) did not hold.`);
  process.exit(1);
}
console.log('\n✓ Recorded. See docs/architecture/13-forms-foundation.md.');
