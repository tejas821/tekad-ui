#!/usr/bin/env node
/**
 * TEKAD — self-test for the dependency-boundary rules.
 *
 * ADR-012 wires `@nx/enforce-module-boundaries` on day one because retrofitting
 * boundaries after packages exist is painful. But a rule that is configured and
 * never exercised proves nothing: a typo in a tag name, a renamed layer, or an
 * `allow` entry added "temporarily" all fail silently and leave a green build.
 *
 * So the layer graph is pinned by fixtures that are LINTED, in both directions:
 *
 *   - a legal downward import must PASS
 *   - an illegal upward import must FAIL
 *   - a charting import from a `type:charts` project must PASS
 *
 * The fourth case below is deliberately NOT an assertion that the rule fires.
 * Testing it revealed that `bannedExternalImports` cannot see an import of a
 * package that is not installed, so that case pins the LIMITATION instead, and
 * tools/verify-dependency-policy.mjs is the gate that actually closes it.
 *
 * The illegal fixtures are stored as `*.ts.fixture` so they are invisible to
 * the compiler and to normal lint runs; this test copies one into place, lints
 * it, and removes it again. That keeps a deliberately broken file out of the
 * build without weakening what it proves.
 *
 * See eslint.config.mjs and ADR-004 / ADR-008 / ADR-012.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectGraph, graphIsCached } from './lib/project-graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FIX = join(HERE, 'boundary-fixtures');

/*
 * The rule reads a CACHED project graph, and a fresh checkout has none. Without
 * this, every case below fails with "No cached ProjectGraph is available. The
 * rule will be skipped." — which is how CI found it on 2026-09-19, on the first
 * run of the first pull request. The self-test was right; the environment was
 * the thing that had to be prepared.
 */
try {
  const graph = ensureProjectGraph();
  if (graph.warmed) console.log(`  (${graph.detail} before linting — the rule needs it)`);
  /*
   * Warm-up that does not leave a cache behind would be worse than none: the
   * cases below would then all pass vacuously. Assert the property rather than
   * the command's exit code.
   */
  if (!graphIsCached()) {
    console.error(
      'verify-boundaries: the project graph was computed but no cache is visible, so the\n' +
        'boundary rule would be SKIPPED and every case below would pass without evaluating\n' +
        'anything. Fix tools/lib/project-graph.mjs before trusting this run.',
    );
    process.exit(1);
  }
} catch (e) {
  console.error(`verify-boundaries: ${String(e instanceof Error ? e.message : e)}`);
  process.exit(1);
}

/**
 * Run eslint on one file.
 *
 * `skipped` is reported separately from a clean result on purpose. A skipped
 * rule and a satisfied rule produce the same exit code and the same empty
 * output, and every assertion below would pass in the skipped case — which is
 * the failure this whole file exists to prevent.
 *
 * @param {string} relPath
 * @returns {{status: number | null, out: string, skipped: boolean}}
 */
function lint(relPath) {
  const res = spawnSync(
    process.execPath,
    [join(ROOT, 'node_modules/eslint/bin/eslint.js'), relPath],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  const out = (res.stdout ?? '') + (res.stderr ?? '');
  return { status: res.status, out, skipped: /No cached ProjectGraph is available/i.test(out) };
}

const cases = [
  {
    name: 'LEGAL: layer:component may import layer:foundation',
    file: 'tools/boundary-fixtures/component/src/index.ts',
    expectViolation: false,
  },
  {
    name: 'LEGAL: a type:charts project may import a charting library',
    file: 'tools/boundary-fixtures/charts/src/index.ts',
    expectViolation: false,
  },
  {
    name: 'ILLEGAL: layer:foundation may NOT import layer:component',
    fixture: join(FIX, 'foundation/src/illegal-upward.ts.fixture'),
    file: 'tools/boundary-fixtures/foundation/src/illegal-upward.ts',
    expectViolation: true,
    expectMessage: /layer:foundation.*can only depend on/i,
  },
  /*
   * MEASURED LIMITATION, not a passing case.
   *
   * `bannedExternalImports` cannot fire for a package that is not installed.
   * The rule's own source takes the external branch only when
   * `targetProject.type === 'npm'`, and an npm node exists in the Nx graph only
   * for packages actually in the dependency tree. Importing `chart.js` when
   * `chart.js` is absent produces NO violation at all.
   *
   * So the eslint rule is the SECOND line of defence — it engages once someone
   * has already installed a chart library. The first line is
   * tools/verify-dependency-policy.mjs, which fails on the DECLARATION.
   *
   * This case pins the limitation so that a future Nx release changing the
   * behaviour is noticed rather than silently relied upon.
   */
  {
    name:
      'KNOWN LIMITATION: an uninstalled banned import is invisible to eslint ' +
      '(verify-dependency-policy.mjs is the gate that catches it)',
    fixture: join(FIX, 'foundation/src/illegal-charts.ts.fixture'),
    file: 'tools/boundary-fixtures/foundation/src/illegal-charts.ts',
    expectViolation: false,
  },
];

let failed = 0;

for (const c of cases) {
  const abs = join(ROOT, c.file);
  if (c.fixture) copyFileSync(c.fixture, abs);
  try {
    const { out, skipped } = lint(c.file);
    const sawViolation = /@nx\/enforce-module-boundaries/.test(out);
    let ok = sawViolation === c.expectViolation;
    if (ok && c.expectMessage) ok = c.expectMessage.test(out);

    console.log(`${ok ? '✓' : '✗'} ${c.name}${skipped ? '  — RULE SKIPPED' : ''}`);
    if (skipped) {
      failed++;
      console.error(
        '    the rule reported "No cached ProjectGraph is available" and was SKIPPED.\n' +
          '    A skipped rule is not a satisfied rule: nothing was evaluated.\n' +
          '    Run `pnpm run ensure:graph` (or any nx command) so the graph exists.',
      );
    } else if (!ok) {
      failed++;
      console.error(
        `    expected ${c.expectViolation ? 'a boundary violation' : 'no boundary violation'}` +
          (c.expectMessage ? ` matching ${c.expectMessage}` : '') +
          `\n    eslint said:\n${out
            .split('\n')
            .map((l) => '      ' + l)
            .join('\n')}`,
      );
    }
  } finally {
    if (c.fixture && existsSync(abs)) rmSync(abs);
  }
}

if (failed > 0) {
  console.error(`\n${failed} boundary self-test(s) failed — the layer graph is not enforced.`);
  process.exit(1);
}
console.log('\n✓ Dependency-boundary rules are enforced in both directions.');
