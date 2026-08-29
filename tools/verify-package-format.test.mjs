#!/usr/bin/env node
/**
 * Self-test for tools/verify-package-format.mjs.
 *
 * The gate's whole value is that it fires on things nobody notices in review: a
 * missing `sideEffects: false`, a wildcard subpath, a library built in full
 * compilation mode. If any of those checks quietly stopped working, the build
 * would stay green and the damage would surface in a consumer's project.
 *
 * So each check gets a synthetic package that violates exactly that rule, plus
 * one package that satisfies all of them — because a gate that fails on
 * everything is as useless as one that fails on nothing.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-package-format.mjs');

/** A package.json that passes every check; each case mutates one thing. */
const GOOD = {
  name: '@tekad/fixture',
  version: '0.0.0',
  private: true,
  sideEffects: false,
  type: 'module',
  module: 'fesm2022/fixture.mjs',
  typings: 'types/fixture.d.ts',
  peerDependencies: { '@angular/core': '^22.1.0' },
  exports: {
    './package.json': { default: './package.json' },
    '.': { types: './types/fixture.d.ts', default: './fesm2022/fixture.mjs' },
  },
};

/** Partial-compiled FESM content — what a correct build emits. */
const PARTIAL_FESM = `import * as i0 from '@angular/core';
class Fixture {}
Fixture.ɵcmp = i0.ɵɵngDeclareComponent({ type: Fixture, selector: 'tk-fixture' });
export { Fixture };
`;

/** Full-compiled FESM content — what a misconfigured build emits. */
const FULL_FESM = `import * as i0 from '@angular/core';
class Fixture {}
Fixture.ɵcmp = i0.ɵɵdefineComponent({ type: Fixture, selectors: [['tk-fixture']] });
export { Fixture };
`;

/**
 * @param {object} pkg
 * @param {{fesm?: string, withSrc?: boolean}} [opts]
 * @returns {string} path to a dist directory holding one built package
 */
function makeDist(pkg, opts = {}) {
  const dist = mkdtempSync(join(tmpdir(), 'tekad-pkgfmt-'));
  const dir = join(dist, 'fixture');
  mkdirSync(join(dir, 'fesm2022'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(dir, 'fesm2022/fixture.mjs'), opts.fesm ?? PARTIAL_FESM);
  if (opts.withSrc) mkdirSync(join(dir, 'src'), { recursive: true });
  return dist;
}

/**
 * @param {string} dist
 */
function run(dist) {
  const r = spawnSync(process.execPath, [SCRIPT, dist], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/** @type {{name: string, pkg: object, opts?: object, expectExit: number, expectMatch?: RegExp}[]} */
const cases = [
  { name: 'a correct package → PASS', pkg: GOOD, expectExit: 0 },
  {
    name: 'FULL compilation (prepublishOnly guard present) → FAIL',
    pkg: { ...GOOD, scripts: { prepublishOnly: 'node --eval "..." && exit 1' } },
    expectExit: 1,
    expectMatch: /FULL compilation mode/,
  },
  {
    name: 'FULL compilation detected in the FESM itself → FAIL',
    pkg: GOOD,
    opts: { fesm: FULL_FESM },
    expectExit: 1,
    expectMatch: /fully-compiled Angular definitions/,
  },
  {
    name: 'sideEffects missing → FAIL',
    pkg: { ...GOOD, sideEffects: undefined },
    expectExit: 1,
    expectMatch: /sideEffects/,
  },
  {
    name: 'sideEffects: true → FAIL',
    pkg: { ...GOOD, sideEffects: true },
    expectExit: 1,
    expectMatch: /sideEffects/,
  },
  {
    name: 'a WILDCARD subpath in exports → FAIL',
    pkg: { ...GOOD, exports: { ...GOOD.exports, './*': { default: './*' } } },
    expectExit: 1,
    expectMatch: /WILDCARD subpath/,
  },
  {
    name: 'an internal ./src subpath in exports → FAIL',
    pkg: {
      ...GOOD,
      exports: { ...GOOD.exports, './src/lib': { types: './t.d.ts', default: './x.mjs' } },
    },
    expectExit: 1,
    expectMatch: /internal path/,
  },
  {
    name: 'an exports subpath with no "types" condition → FAIL',
    pkg: { ...GOOD, exports: { ...GOOD.exports, './x': { default: './fesm2022/x.mjs' } } },
    expectExit: 1,
    expectMatch: /without a "types" condition/,
  },
  {
    name: 'type is not "module" → FAIL',
    pkg: { ...GOOD, type: 'commonjs' },
    expectExit: 1,
    expectMatch: /not "module"/,
  },
  {
    name: 'no types entry → FAIL',
    pkg: { ...GOOD, typings: undefined },
    expectExit: 1,
    expectMatch: /declares no types entry/,
  },
  {
    name: 'a shipped src/ directory → FAIL',
    pkg: GOOD,
    opts: { withSrc: true },
    expectExit: 1,
    expectMatch: /ships a src\/ directory/,
  },
  {
    name: 'an EXACT external peer pin → FAIL',
    pkg: { ...GOOD, peerDependencies: { '@angular/core': '22.1.4' } },
    expectExit: 1,
    expectMatch: /pins peer/,
  },
  {
    name: 'an exact peer pin on a WORKSPACE-internal package → PASS (they move together)',
    pkg: { ...GOOD, peerDependencies: { '@angular/core': '^22.1.0', '@tekad/core': '0.0.0' } },
    expectExit: 0,
  },
];

let failed = 0;
for (const c of cases) {
  const dist = makeDist(c.pkg, c.opts ?? {});
  try {
    const { status, out } = run(dist);
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
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

if (failed > 0) {
  console.error(`\n${failed} package-format self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ Package-format gate self-test passed.');
