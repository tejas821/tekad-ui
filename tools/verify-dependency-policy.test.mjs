#!/usr/bin/env node
/**
 * Self-test for tools/verify-dependency-policy.mjs.
 *
 * The gate exists because the eslint boundary rule provably cannot see an
 * uninstalled banned import. A replacement guard that also cannot fail would be
 * no better, so both directions are pinned here against temporary fixture
 * projects written into the workspace and removed afterwards.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCRIPT = join(HERE, 'verify-dependency-policy.mjs');
const TMP = join(ROOT, 'packages', '__policy-fixture__');

function run() {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/**
 * @param {{deps?: Record<string,string>, devDeps?: Record<string,string>, tags?: string[]}} spec
 */
function writeFixture({ deps = {}, devDeps = {}, tags = [] }) {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(
    join(TMP, 'package.json'),
    JSON.stringify(
      {
        name: '@tekad/policy-fixture',
        version: '0.0.0',
        private: true,
        dependencies: deps,
        devDependencies: devDeps,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(TMP, 'project.json'),
    JSON.stringify({ name: 'policy-fixture', projectType: 'library', tags }, null, 2),
  );
}

const cases = [
  {
    name: 'a charting library in an UNTAGGED project must FAIL',
    fixture: { deps: { 'chart.js': '^4.0.0' } },
    expectExit: 1,
    expectMatch: /chart\.js/,
  },
  {
    name: 'a d3-* package in an UNTAGGED project must FAIL (prefix rule)',
    fixture: { deps: { 'd3-scale': '^4.0.0' } },
    expectExit: 1,
    expectMatch: /d3-scale/,
  },
  {
    name: 'the same charting library in a type:charts project must PASS',
    fixture: { deps: { 'chart.js': '^4.0.0' }, tags: ['layer:integration', 'type:charts'] },
    expectExit: 0,
  },
  {
    name: 'a test framework in "dependencies" must FAIL',
    fixture: { deps: { vitest: '^4.0.0' } },
    expectExit: 1,
    expectMatch: /vitest/,
  },
  {
    name: 'a test framework in "devDependencies" must PASS',
    fixture: { devDeps: { vitest: '^4.0.0' } },
    expectExit: 0,
  },
  {
    name: 'the real workspace, with no fixture at all, must PASS',
    fixture: null,
    expectExit: 0,
  },
];

let failed = 0;
for (const c of cases) {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  if (c.fixture) writeFixture(c.fixture);
  try {
    const { status, out } = run();
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
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  }
}

if (failed > 0) {
  console.error(`\n${failed} dependency-policy self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log(
  '\n✓ Dependency-policy gate self-test passed (fails on a banned declaration, allows a tagged one).',
);
