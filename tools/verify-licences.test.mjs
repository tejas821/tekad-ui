#!/usr/bin/env node
/**
 * Self-test for tools/verify-licences.mjs.
 *
 * Two properties have to hold at once, and they pull against each other:
 *
 *   RECALL   — a package that DECLARES something permissive while its LICENSE
 *              file grants copyleft must be caught. That is the whole point of
 *              ADR-015's "the field is not evidence" rule.
 *
 *   PRECISION — a licence file that merely MENTIONS the GPL in a historical
 *              paragraph must not be flagged. The first version of the gate
 *              failed this on `argparse` and would have taught everyone to
 *              ignore it.
 *
 * Loosening the title heuristic to silence a false positive would quietly
 * destroy recall, so both directions are pinned here with synthetic reports.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-licences.mjs');
const FIX = join(HERE, '__fixtures__/licences');
const TMP = mkdtempSync(join(tmpdir(), 'tekad-lic-'));

/**
 * @param {string} name
 * @param {Record<string, {name: string, version: string, paths: string[]}[]>} report
 * @returns {string}
 */
function writeReport(name, report) {
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(report, null, 2));
  return p;
}

/** An empty exceptions file, so exception behaviour is tested explicitly. */
const NO_EXCEPTIONS = writeReport('no-exceptions.json', /** @type {never} */ ({ exceptions: [] }));

/**
 * @param {string} prod
 * @param {string} all
 * @param {string} exceptions
 */
function run(prod, all, exceptions) {
  const r = spawnSync(process.execPath, [SCRIPT, prod, all, exceptions], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

const clean = { MIT: [{ name: 'fake-clean', version: '1.0.0', paths: [join(FIX, 'fake-clean')] }] };

const gplDeclaredMit = {
  MIT: [
    {
      name: 'fake-gpl-declared-mit',
      version: '1.0.0',
      paths: [join(FIX, 'fake-gpl-declared-mit')],
    },
  ],
};

const narrative = {
  'Python-2.0': [
    {
      name: 'fake-narrative-mention',
      version: '1.0.0',
      paths: [join(FIX, 'fake-narrative-mention')],
    },
  ],
};

const forbiddenDeclared = {
  'MPL-2.0': [{ name: 'fake-mpl', version: '1.0.0', paths: [join(FIX, 'fake-clean')] }],
};

const cases = [
  {
    name: 'RECALL: MIT declared, GPL granted in LICENSE → FAIL',
    prod: writeReport('p1.json', clean),
    all: writeReport('a1.json', gplDeclaredMit),
    exceptions: NO_EXCEPTIONS,
    expectExit: 1,
    expectMatch: /LICENSE text GRANTS GPL/,
  },
  {
    name: 'PRECISION: GPL named only in a historical paragraph → PASS',
    prod: writeReport('p2.json', clean),
    all: writeReport('a2.json', narrative),
    exceptions: NO_EXCEPTIONS,
    expectExit: 0,
  },
  {
    name: 'a forbidden licence in the PRODUCTION tree → FAIL (no exception path)',
    prod: writeReport('p3.json', forbiddenDeclared),
    all: writeReport('a3.json', forbiddenDeclared),
    exceptions: writeReport(
      'e3.json',
      /** @type {never} */ ({
        exceptions: [{ package: 'fake-mpl', licence: 'MPL-2.0', justification: 'dev only' }],
      }),
    ),
    expectExit: 1,
    expectMatch: /PRODUCTION DEPENDENCY TREE/,
  },
  {
    name: 'the same licence in BUILD TOOLING with a recorded exception → PASS',
    prod: writeReport('p4.json', clean),
    all: writeReport('a4.json', forbiddenDeclared),
    exceptions: writeReport(
      'e4.json',
      /** @type {never} */ ({
        exceptions: [
          {
            package: 'fake-mpl',
            licence: 'MPL-2.0',
            justification: 'build tooling, ships nothing',
          },
        ],
      }),
    ),
    expectExit: 0,
    expectMatch: /reviewed exception/,
  },
  {
    name: 'the same licence in BUILD TOOLING with NO exception recorded → FAIL',
    prod: writeReport('p5.json', clean),
    all: writeReport('a5.json', forbiddenDeclared),
    exceptions: NO_EXCEPTIONS,
    expectExit: 1,
    expectMatch: /not on the reviewed exception list/,
  },
];

let failed = 0;
for (const c of cases) {
  const { status, out } = run(c.prod, c.all, c.exceptions);
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
  console.error(`\n${failed} licence-gate self-test(s) failed — the audit is not trustworthy.`);
  process.exit(1);
}
console.log(
  '\n✓ Licence gate self-test passed (catches a disguised grant, ignores a mere mention).',
);
