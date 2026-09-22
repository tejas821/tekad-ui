#!/usr/bin/env node
/**
 * Self-test for the per-entry-point size budgets.
 *
 * A budget gate fails in two directions, and only one of them is loud. The
 * quiet one is a comparison that has stopped comparing: an axis nobody reads, a
 * package that stopped being measured, a budget entry for an entry point that
 * was renamed away two releases ago. All of those report success.
 *
 * So the cases below are the ones where a lazy implementation looks healthy —
 * the tolerance boundary, the missing budget, the stale budget, the package
 * that was not measured at all — plus the arithmetic that has to hold for the
 * numbers in `tools/size-budget.json` to mean what they say.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, bytes, AXES } from './size-budget.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, '..', 'verify-size-budget.mjs');

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/** A budget and a measurement that agree exactly. */
const budget = {
  tolerancePercent: 2,
  packages: {
    '@tekad/x': { packed: 1000, entryPoints: { '.': { raw: 4000, gzip: 1000, brotli: 800 } } },
  },
};
/** @param {number} packed @param {number} [raw] @param {number} [gzip] @param {number} [brotli] */
const measured = (packed, raw = 4000, gzip = 1000, brotli = 800) => [
  { name: '@tekad/x', packed, entryPoints: { '.': { raw, gzip, brotli } } },
];

/* ── compare ─────────────────────────────────────────────────────────────── */

check(
  'a measurement equal to the budget passes',
  compare(budget, measured(1000)).failures.length === 0,
);

check(
  'a measurement inside the tolerance passes',
  compare(budget, measured(1019)).failures.length === 0,
  '1.9% over, tolerance 2%',
);

{
  const f = compare(budget, measured(1030)).failures;
  check(
    'A REGRESSION PAST THE TOLERANCE FAILS — the reason the gate exists',
    f.length === 1 && /packed tarball is/.test(f[0] ?? ''),
    f.length === 0 ? 'growth was accepted' : `reported ${f.length} finding(s)`,
  );
}

{
  const r = compare(budget, measured(900));
  check(
    'a shrink passes and is reported as a note',
    r.failures.length === 0 && r.notes.length === 1 && /smaller than budget/.test(r.notes[0] ?? ''),
  );
}

/*
 * Every axis is enforced independently. A change that grows raw and shrinks
 * gzip is a real, measured outcome — `_ngcontent` does exactly that — so a
 * budget that only watched gzip would miss the half of it that costs parse
 * time.
 */
for (const axis of AXES) {
  const now = { raw: 4000, gzip: 1000, brotli: 800 };
  now[axis] = Math.round(now[axis] * 1.5);
  const f = compare(budget, [
    { name: '@tekad/x', packed: 1000, entryPoints: { '.': now } },
  ]).failures;
  check(
    `growth on the ${axis} axis alone fails, and names the axis`,
    f.some((x) => x.includes(axis)),
    f.length === 0 ? 'not watched' : undefined,
  );
}

{
  const f = compare(budget, [
    {
      name: '@tekad/x',
      packed: 1000,
      entryPoints: {
        '.': { raw: 4000, gzip: 1000, brotli: 800 },
        './new': { raw: 2000, gzip: 500, brotli: 400 },
      },
    },
  ]).failures;
  check(
    'AN UNBUDGETED ENTRY POINT FAILS — a budget covering only what someone remembered is not coverage',
    f.length === 1 && /measured but not budgeted/.test(f[0] ?? ''),
  );
}

{
  const stale = {
    tolerancePercent: 2,
    packages: {
      '@tekad/x': {
        packed: 1000,
        entryPoints: {
          '.': { raw: 4000, gzip: 1000, brotli: 800 },
          './gone': { raw: 2000, gzip: 500, brotli: 400 },
        },
      },
    },
  };
  const f = compare(stale, measured(1000)).failures;
  check(
    'A BUDGETED ENTRY POINT THAT NO LONGER EXISTS FAILS — a stale budget claims coverage it does not have',
    f.length === 1 && /no longer built/.test(f[0] ?? ''),
  );
}

{
  const f = compare(budget, []).failures;
  check(
    'A BUDGETED PACKAGE THAT WAS NOT MEASURED FAILS — the gate must not pass by measuring nothing',
    f.length === 1 && /budgeted and not measured/.test(f[0] ?? ''),
  );
}

/* ── bytes ───────────────────────────────────────────────────────────────── */

check('bytes() reports sub-kilobyte figures exactly', bytes(871) === '871 B');
check('bytes() reports kilobytes to two places', bytes(12868) === '12.57 KB');

/* ── the CLI, against a synthetic dist ───────────────────────────────────── */

/** One synthetic built package: enough for npm to pack it, nothing more. */
function makeDist() {
  const dist = mkdtempSync(join(tmpdir(), 'tekad-size-'));
  const dir = join(dist, 'fixture');
  mkdirSync(join(dir, 'fesm2022'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: '@tekad/fixture',
        version: '0.0.0',
        private: true,
        sideEffects: false,
        type: 'module',
        exports: { '.': { types: './types/index.d.ts', default: './fesm2022/index.mjs' } },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(dir, 'fesm2022/index.mjs'), 'export const X = "x".repeat(200);\n');
  return dist;
}

const dist = makeDist();
try {
  const budgetFile = join(dist, 'budget.json');
  /** Run the real gate, against the synthetic dist, with the given budget file. */
  const run = () => {
    const r = spawnSync(process.execPath, [GATE, '--dist', dist, '--budget', budgetFile], {
      encoding: 'utf8',
    });
    return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
  };

  writeFileSync(budgetFile, JSON.stringify({ tolerancePercent: 2, packages: {} }));
  const unbudgeted = run();
  check(
    'the CLI fails on a package with no committed budget',
    unbudgeted.status === 1 && /no committed budget/.test(unbudgeted.out),
    unbudgeted.status === 0 ? 'an unmeasured package was waved through' : undefined,
  );

  /*
   * Measure once through the gate itself, then commit exactly what it measured:
   * the packed bytes and the entry-point axes, which is what a real
   * re-baseline does.
   */
  const report = spawnSync(
    process.execPath,
    [GATE, '--dist', dist, '--budget', budgetFile, '--report'],
    { encoding: 'utf8' },
  ).stdout;
  const marker = '{\n  "tolerancePercent"';
  const at = report.indexOf(marker);
  check('--report prints the measurement in the shape of the budget file', at !== -1);
  const measuredJson = JSON.parse(report.slice(at));

  writeFileSync(
    budgetFile,
    JSON.stringify({ tolerancePercent: 2, packages: measuredJson.packages }),
  );
  const exact = run();
  check(
    'the CLI passes when the committed budget is the measurement',
    exact.status === 0,
    exact.status === 0 ? undefined : exact.out.split('\n').slice(-5).join(' '),
  );

  const shrunken = JSON.parse(JSON.stringify(measuredJson.packages));
  shrunken['@tekad/fixture'].packed = Math.round(shrunken['@tekad/fixture'].packed * 0.5);
  shrunken['@tekad/fixture'].entryPoints['.'].gzip = Math.round(
    shrunken['@tekad/fixture'].entryPoints['.'].gzip * 0.5,
  );
  writeFileSync(budgetFile, JSON.stringify({ tolerancePercent: 2, packages: shrunken }));
  const regression = run();
  check(
    'the CLI fails when the tarball and the entry point both outgrow their budgets',
    regression.status === 1 && /Size budget failed/.test(regression.out),
    regression.status === 0 ? 'a 2x regression was accepted' : undefined,
  );
} finally {
  rmSync(dist, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\n${failed} size-budget self-test(s) failed — the budget is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ The size budgets fail on growth, on a missing budget, and on a stale one.');
