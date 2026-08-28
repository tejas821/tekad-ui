#!/usr/bin/env node
/**
 * Self-test for tools/verify-audit.mjs.
 *
 * The gate's whole reason to exist is that the easy way to get a green build —
 * lowering `--audit-level` — disables the check for everything. So the gate has
 * to actually fail in the cases it claims to cover, including the one people
 * forget: an exception that has quietly expired.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-audit.mjs');
const TMP = mkdtempSync(join(tmpdir(), 'tekad-audit-'));

/**
 * @param {string} name
 * @param {unknown} body
 * @returns {string}
 */
function write(name, body) {
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(body, null, 2));
  return p;
}

const NONE = write('none.json', { advisories: {} });
const ADVISORY = write('adv.json', {
  advisories: {
    1234: {
      module_name: 'fake-mod',
      severity: 'high',
      title: 'fake denial of service',
      patched_versions: 'null',
    },
  },
});
const NO_EXC = write('no-exc.json', { exceptions: [] });
const CURRENT_EXC = write('cur-exc.json', {
  exceptions: [
    { module: 'fake-mod', justification: 'build tooling, never executed', expires: '2099-01-01' },
  ],
});
const EXPIRED_EXC = write('exp-exc.json', {
  exceptions: [
    { module: 'fake-mod', justification: 'build tooling, never executed', expires: '2020-01-01' },
  ],
});

/**
 * @param {string} prod
 * @param {string} all
 * @param {string} exc
 */
function run(prod, all, exc) {
  const r = spawnSync(process.execPath, [SCRIPT, prod, all, exc, '2026-08-28'], {
    encoding: 'utf8',
  });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

const cases = [
  { name: 'a clean tree → PASS', prod: NONE, all: NONE, exc: NO_EXC, expectExit: 0 },
  {
    name: 'an advisory in the PRODUCTION tree → FAIL even with an exception recorded',
    prod: ADVISORY,
    all: ADVISORY,
    exc: CURRENT_EXC,
    expectExit: 1,
    expectMatch: /PRODUCTION DEPENDENCY TREE/,
  },
  {
    name: 'a build-tooling advisory with NO exception → FAIL',
    prod: NONE,
    all: ADVISORY,
    exc: NO_EXC,
    expectExit: 1,
    expectMatch: /without a current recorded exception/,
  },
  {
    name: 'a build-tooling advisory with a CURRENT exception → PASS',
    prod: NONE,
    all: ADVISORY,
    exc: CURRENT_EXC,
    expectExit: 0,
    expectMatch: /excepted in build tooling/,
  },
  {
    name: 'a build-tooling advisory with an EXPIRED exception → FAIL',
    prod: NONE,
    all: ADVISORY,
    exc: EXPIRED_EXC,
    expectExit: 1,
    expectMatch: /EXPIRED/,
  },
];

let failed = 0;
for (const c of cases) {
  const { status, out } = run(c.prod, c.all, c.exc);
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
  console.error(`\n${failed} audit-gate self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ Audit gate self-test passed (production is absolute; exceptions expire).');
