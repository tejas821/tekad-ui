#!/usr/bin/env node
/**
 * TEKAD CI gate 14, second instalment — per-entry-point byte budgets.
 *
 * The theme stylesheet has had a budget since Phase 4, because ADR-007 stated
 * one. Everything else waited, and `docs/architecture/05-performance-budgets.md`
 * says why: a number invented before there was anything to measure would be
 * invented rather than measured, and an invented budget is worse than none —
 * it looks like evidence.
 *
 * Phase 9 built the components. This gate holds them to what they cost, per
 * entry point, on the artefact a consumer downloads.
 *
 * Measured on the packed tarball, not on `dist/`: npm's own ignore rules decide
 * what ships, and a budget on the wrong file set is a budget on nothing. The
 * packing is `tools/lib/tarball.mjs`, shared with the consumer-boundary gate.
 *
 * `--report` prints what was measured in the shape of the budget file. The
 * point is that re-baselining is a deliberate edit with the numbers in front of
 * you; it is not a flag that rewrites the file and moves on.
 *
 * Usage: node tools/verify-size-budget.mjs [--dist <dir>] [--budget <file>] [--report]
 * Exit 0 = nothing grew past its committed budget. Exit 1 = something did.
 */
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pack, measure } from './lib/tarball.mjs';
import { compare, measurePackage, bytes, AXES } from './lib/size-budget.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} flag */
function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const DIST = resolve(argOf('--dist') ?? join(ROOT, 'dist/packages'));
const BUDGET_FILE = resolve(argOf('--budget') ?? join(ROOT, 'tools/size-budget.json'));
const REPORT = process.argv.includes('--report');

if (!existsSync(DIST)) {
  console.error(`verify-size-budget: ${DIST} does not exist. Run \`pnpm build\` first.`);
  process.exit(1);
}
if (!existsSync(BUDGET_FILE)) {
  console.error(`verify-size-budget: ${BUDGET_FILE} does not exist.`);
  process.exit(1);
}

/** @type {import('./lib/size-budget.mjs').Budget} */
const budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));

const dirs = readdirSync(DIST)
  .map((d) => join(DIST, d))
  .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'package.json')));

if (dirs.length === 0) {
  console.error(`verify-size-budget: no built packages under ${DIST}.`);
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'tekad-size-'));
/** @type {import('./lib/size-budget.mjs').Measurement[]} */
const measurements = [];
try {
  for (const dir of dirs) {
    const pkg = pack(dir, scratch);
    measurements.push(measurePackage(pkg, (file) => measure(file)));
  }
} catch (e) {
  console.error(`verify-size-budget: ${String(e)}`);
  rmSync(scratch, { recursive: true, force: true });
  process.exit(1);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

measurements.sort((a, b) => a.name.localeCompare(b.name));

/* -------------------------------- report ---------------------------------- */

console.log(
  `Size budget — ${measurements.length} packed package(s), tolerance ` +
    `${budget.tolerancePercent}%\n`,
);

for (const m of measurements) {
  const p = budget.packages[m.name];
  const packed = `packed ${bytes(m.packed)}`;
  const vs = p ? `/ ${bytes(p.packed)}` : '/ NOT BUDGETED';
  console.log(`  ${m.name.padEnd(22)} ${packed.padEnd(18)} ${vs}`);
  for (const [entry, now] of Object.entries(m.entryPoints)) {
    const was = p?.entryPoints[entry];
    const axes = AXES.map(
      (axis) => `${axis} ${bytes(now[axis])}${was ? `/${bytes(was[axis])}` : '/—'}`,
    ).join('  ');
    console.log(`    ${(entry === '.' ? '(root)' : entry).padEnd(28)} ${axes}`);
  }
}

const { failures, notes } = compare(budget, measurements);

if (REPORT) {
  console.log('\nMeasured, in the shape of tools/size-budget.json:\n');
  console.log(
    JSON.stringify(
      {
        tolerancePercent: budget.tolerancePercent,
        packages: Object.fromEntries(
          measurements.map((m) => [m.name, { packed: m.packed, entryPoints: m.entryPoints }]),
        ),
      },
      null,
      2,
    ),
  );
}

if (notes.length) {
  console.log('');
  for (const n of notes) console.log(`· ${n}`);
}

if (failures.length) {
  console.error(`\n✗ Size budget failed:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\n  Growth is not automatically wrong. It is a cost, and the change that causes it should ' +
      '\n  say what the cost buys. Re-baseline deliberately: run with --report and edit' +
      '\n  tools/size-budget.json in the same commit.',
  );
  process.exit(1);
}

console.log('\n✓ Every package and entry point is within its committed budget.');
