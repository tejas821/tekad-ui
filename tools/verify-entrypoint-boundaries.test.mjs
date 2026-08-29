#!/usr/bin/env node
/**
 * Self-test for tools/verify-entrypoint-boundaries.mjs.
 *
 * The two fixtures are byte-identical except for one import specifier. That is
 * the point: the gate must react to the crossing itself, not to anything
 * incidental about how the fixture is shaped.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-entrypoint-boundaries.mjs');
const FIX = join(HERE, '__fixtures__/entrypoints');
const ROOT = join(HERE, '..');

/** @param {string} dir */
function run(dir) {
  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

const cases = [
  {
    name: 'entry points reaching each other through the PACKAGE SPECIFIER → PASS',
    dir: join(FIX, 'legal'),
    expectExit: 0,
  },
  {
    name: 'the same code with a RELATIVE crossing → FAIL',
    dir: join(FIX, 'illegal'),
    expectExit: 1,
    expectMatch: /crosses an entry-point boundary/,
  },
  {
    name: "TEKAD's real packages → PASS",
    dir: join(ROOT, 'packages'),
    expectExit: 0,
  },
];

let failed = 0;
for (const c of cases) {
  const { status, out } = run(c.dir);
  let ok = status === c.expectExit;
  if (ok && c.expectMatch) ok = c.expectMatch.test(out);
  console.log(`${ok ? '✓' : '✗'} ${c.name}  (exit ${status}, expected ${c.expectExit})`);
  if (!ok) {
    failed++;
    console.error(
      out
        .split('\n')
        .map((l) => '      ' + l)
        .join('\n'),
    );
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} entry-point-boundary self-test(s) failed — the gate is not trustworthy.`,
  );
  process.exit(1);
}
console.log('\n✓ Entry-point boundary gate self-test passed.');
