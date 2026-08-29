#!/usr/bin/env node
/**
 * TEKAD — prove the unit tests fail when the code is wrong.
 *
 * Every gate in `tools/` ships with a self-test proving it fails when it
 * should. This is that discipline applied to the unit tests, and they need it
 * more than the gates do: a gate that stops working tends to fail loudly on
 * its fixture, whereas a unit test that stops asserting anything simply goes
 * green and stays green.
 *
 * The live-announcer suite is the case that prompted this. Delete the one line
 * that makes a repeated announcement audible and nine of its eleven browser
 * tests still pass. The suite being green was never the interesting fact.
 *
 * ── How it works ─────────────────────────────────────────────────────────
 *
 * For each entry in `tools/mutants.json`: break the source in a specific,
 * plausible way, run that project's tests, and require that the *named* tests
 * fail. Then put the source back.
 *
 * Requiring named tests rather than "some test failed" is the whole point. A
 * mutant that fails the build fails every test, which would satisfy a laxer
 * check while proving nothing; and if the test that was doing the catching is
 * renamed away, this says so instead of quietly accepting a red run.
 *
 * ── Restoring the tree ───────────────────────────────────────────────────
 *
 * This is the only tool in TEKAD that edits source files, so it is the only
 * one that can leave a working tree damaged. Originals are captured before any
 * edit and restored in a `finally`, on SIGINT and SIGTERM, and once more on
 * exit; the restore is then verified by re-reading and comparing. If a restore
 * cannot be confirmed the process exits non-zero and says exactly which file
 * to check, because a silent failure here would look like uncommitted work
 * appearing from nowhere.
 *
 * Usage: node tools/verify-mutation.mjs [--only <id-substring>]
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyAnchor, judge } from './lib/mutation.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'tools/mutants.json');

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

/** Files edited so far, with their original bytes. */
/** @type {Map<string, string>} */
const originals = new Map();
let restoring = false;

function restoreAll() {
  if (restoring) return true;
  restoring = true;
  let allGood = true;
  for (const [file, content] of originals) {
    try {
      writeFileSync(file, content);
      if (readFileSync(file, 'utf8') !== content) throw new Error('content differs after write');
    } catch (e) {
      allGood = false;
      console.error(`\n!! COULD NOT RESTORE ${file}`);
      console.error(`   ${String(e)}`);
      console.error('   This file is mutated on disk. Restore it from git before committing.');
    }
  }
  restoring = false;
  return allGood;
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restoreAll();
    process.exit(130);
  });
}
process.on('exit', () => {
  restoreAll();
});

const tmp = mkdtempSync(join(tmpdir(), 'tekad-mutation-'));

/**
 * Run one project's tests and return the parsed report.
 *
 * `--skip-nx-cache` is not optional here: the source is different on every
 * run and Nx would otherwise be entitled to replay a cached green result for
 * an input it has already seen — which is precisely the wrong answer.
 *
 * @param {string} project
 * @param {string} label
 */
function runTests(project, label) {
  const out = join(tmp, `${label}.json`);
  const r = spawnSync(
    'pnpm',
    [
      'exec',
      'nx',
      'test',
      project,
      '--skip-nx-cache',
      '--reporters=json',
      `--outputFile=${out}`,
      '--quiet',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (!existsSync(out)) {
    return {
      report: { numTotalTests: 0, numFailedTests: 0, testResults: [] },
      raw: (r.stdout ?? '') + (r.stderr ?? ''),
    };
  }
  return {
    report: JSON.parse(readFileSync(out, 'utf8')),
    raw: (r.stdout ?? '') + (r.stderr ?? ''),
  };
}

/** @type {{mutants: import('./lib/mutation.mjs').Mutant[]}} */
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const mutants = manifest.mutants.filter((m) => !only || m.id.includes(only));

if (mutants.length === 0) {
  console.error(`verify-mutation: no mutants matched ${JSON.stringify(only)}.`);
  process.exit(1);
}

console.log('TEKAD mutation gate — do the unit tests fail when the code is wrong?\n');

/* ── 1. Baseline. ──────────────────────────────────────────────────────────
 * Mutation testing against an already-red suite proves nothing: every mutant
 * would look caught. So the suites must be green before anything is broken.
 */
const projects = [...new Set(mutants.map((m) => m.project))];
for (const p of projects) {
  const { report, raw } = runTests(p, `baseline-${p}`);
  const green = report.numTotalTests > 0 && report.numFailedTests === 0;
  console.log(
    `${green ? '✓' : '✗'} baseline ${p}: ${report.numPassedTests ?? 0}/${report.numTotalTests} passing`,
  );
  if (!green) {
    console.error(
      '\nThe suite is not green before mutation. Every mutant would look caught,\n' +
        'so the run is abandoned rather than reporting a result it cannot support.\n',
    );
    console.error(raw.slice(-2000));
    rmSync(tmp, { recursive: true, force: true });
    process.exit(1);
  }
}

/* ── 2. Mutate. ────────────────────────────────────────────────────────── */
let failed = 0;
console.log('');

try {
  for (const m of mutants) {
    const file = join(ROOT, m.file);
    if (!existsSync(file)) {
      console.log(`✗ ${m.id}\n    ${m.file} does not exist.`);
      failed++;
      continue;
    }
    const source = readFileSync(file, 'utf8');
    if (!originals.has(file)) originals.set(file, source);

    const applied = applyAnchor(source, m.find.join('\n'), m.replace.join('\n'));
    if (!applied.ok) {
      console.log(`✗ ${m.id}\n    ${applied.reason}`);
      failed++;
      continue;
    }

    writeFileSync(file, applied.mutated);
    let verdict;
    try {
      const { report } = runTests(m.project, m.id.replace(/\W+/g, '-'));
      verdict = judge(m, report);
    } finally {
      writeFileSync(file, source);
      if (readFileSync(file, 'utf8') !== source) {
        console.error(`!! ${m.file} did not restore. Stopping.`);
        process.exit(2);
      }
    }

    console.log(`${verdict.ok ? '✓' : '✗'} ${m.id}`);
    if (verdict.ok) {
      console.log(`    caught by: ${verdict.caughtBy.map((c) => `"${c}"`).join(', ')}`);
      if (verdict.alsoFailed.length > 0) {
        // Not an error — a real defect often trips more than one test — but
        // worth seeing, because a mutant that fails everything is usually one
        // that broke the build rather than the behaviour.
        console.log(`    (also failed: ${verdict.alsoFailed.length} other test(s))`);
      }
    } else {
      failed++;
      console.log(`    intended defect: ${m.why}`);
      for (const r of verdict.reasons) console.log(`    → ${r}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (!restoreAll()) process.exit(2);

if (failed > 0) {
  console.error(
    `\n✗ ${failed} mutant(s) were not caught.\n\n` +
      'A surviving mutant means the behaviour it breaks is not actually covered.\n' +
      'The fix is a test that fails when that code is wrong — not deleting the\n' +
      'mutant, which would only stop the gate from mentioning it.\n',
  );
  process.exit(1);
}

console.log(
  `\n✓ All ${mutants.length} mutant(s) caught by the tests named for them.\n` +
    '  The suites are not merely green; they are load-bearing.',
);
