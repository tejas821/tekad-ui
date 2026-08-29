#!/usr/bin/env node
/**
 * Self-test for the mutation gate's judgement.
 *
 * The gate exists to stop a unit-test suite from going quietly vacuous. That
 * makes its own vacuity the thing to guard against hardest: a `judge` that
 * returned `{ok: true}` unconditionally would report seven green mutants
 * forever and nobody would notice, because a green mutation report looks
 * exactly like a healthy one.
 *
 * So each of the three ways a mutation run can look successful without being
 * successful is asserted here against a synthetic report. Synthetic rather
 * than real because the interesting cases — a mutant that survives, a manifest
 * naming a test that was deleted — cannot be produced on demand from the real
 * suite without breaking it on purpose and leaving it broken.
 *
 * The anchor cases matter for a different reason: `verify-mutation.mjs` is the
 * only tool in TEKAD that writes to source files, and an anchor that matches
 * in two places would edit somewhere the manifest author never looked.
 */
import { applyAnchor, judge, statuses } from './mutation.mjs';

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/** @param {{fullName: string, status: string}[]} rows */
const report = (rows) => ({
  numTotalTests: rows.length,
  numPassedTests: rows.filter((r) => r.status === 'passed').length,
  numFailedTests: rows.filter((r) => r.status === 'failed').length,
  testResults: [{ assertionResults: rows }],
});

const mutant = {
  id: 'x',
  why: 'w',
  project: 'core',
  file: 'f.ts',
  find: [],
  replace: [],
  expectFailing: ['the load-bearing test'],
};

/* ── anchors ─────────────────────────────────────────────────────────────── */
{
  const r = applyAnchor('a\nB\nc\n', 'B', 'Z');
  check('an anchor matching once is applied', r.ok && r.mutated === 'a\nZ\nc\n');
}
{
  const r = applyAnchor('a\nB\nc\nB\n', 'B', 'Z');
  check(
    'an anchor matching TWICE is refused rather than guessing',
    !r.ok && /more than once/.test(r.reason),
    r.ok ? 'it edited anyway' : r.reason.slice(0, 40),
  );
}
{
  const r = applyAnchor('a\nc\n', 'B', 'Z');
  check(
    'an anchor that is gone reports a stale manifest, not a pass',
    !r.ok && /not in the file/.test(r.reason),
  );
}
{
  const r = applyAnchor('abc', '', 'Z');
  check('an empty anchor is refused', !r.ok);
}

/* ── judgement ───────────────────────────────────────────────────────────── */
{
  const v = judge(
    mutant,
    report([
      { fullName: 'suite the load-bearing test', status: 'failed' },
      { fullName: 'suite something else', status: 'passed' },
    ]),
  );
  check('a mutant caught by the named test PASSES', v.ok, v.reasons.join('; '));
}
{
  const v = judge(
    mutant,
    report([
      { fullName: 'suite the load-bearing test', status: 'passed' },
      { fullName: 'suite something else', status: 'passed' },
    ]),
  );
  check(
    'A SURVIVING MUTANT FAILS — this is the whole point of the gate',
    !v.ok && /PASSED with the mutant applied/.test(v.reasons.join(' ')),
  );
}
{
  // The named test was renamed away. Some other test happens to be red, so the
  // run "failed" — but for a reason nobody chose, and the behaviour the
  // manifest cares about is now unguarded.
  const v = judge(
    mutant,
    report([
      { fullName: 'suite a test with a different name now', status: 'failed' },
      { fullName: 'suite something else', status: 'passed' },
    ]),
  );
  check(
    'a RED run is still a failure when the named test no longer exists',
    !v.ok && /no longer exists/.test(v.reasons.join(' ')),
    v.ok ? 'accepted an unrelated failure as proof' : 'reported the stale name',
  );
}
{
  // A mutant that does not compile fails every test. "The run was red" is
  // true and worthless.
  const v = judge(mutant, report([]));
  check(
    'a mutant that broke the BUILD is not counted as caught',
    !v.ok && /broke the build/.test(v.reasons.join(' ')),
  );
}
{
  const m = { ...mutant, expectFailing: ['first one', 'second one'] };
  const v = judge(
    m,
    report([
      { fullName: 'suite first one', status: 'failed' },
      { fullName: 'suite second one', status: 'passed' },
    ]),
  );
  check(
    'ONE of two named tests failing is not enough',
    !v.ok && /"second one"/.test(v.reasons.join(' ')),
  );
}
{
  // Names are matched on the trailing segment so a manifest can carry the test
  // name without repeating every enclosing describe(). That must not degrade
  // into a substring match, or "no DOM" would match "touches no DOM at all".
  const v = judge(
    { ...mutant, expectFailing: ['bearing test'] },
    report([{ fullName: 'suite the load-bearing test', status: 'failed' }]),
  );
  check(
    'a name is matched on whole trailing words, not as a substring',
    !v.ok,
    v.ok ? '"bearing test" wrongly matched "the load-bearing test"' : 'refused the partial word',
  );
}
{
  const v = judge(
    mutant,
    report([
      { fullName: 'suite the load-bearing test', status: 'failed' },
      { fullName: 'suite collateral', status: 'failed' },
    ]),
  );
  check(
    'collateral failures are reported but do not invalidate a catch',
    v.ok && v.alsoFailed.includes('suite collateral'),
  );
}
{
  const m = statuses(
    report([
      { fullName: 'a', status: 'passed' },
      { fullName: 'b', status: 'failed' },
    ]),
  );
  check('statuses flattens the report', m.get('a') === 'passed' && m.get('b') === 'failed');
}

if (failed > 0) {
  console.error(`\n${failed} mutation-gate self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ The mutation gate rejects surviving mutants, stale names, and broken builds.');
