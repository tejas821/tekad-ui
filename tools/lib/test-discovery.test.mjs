#!/usr/bin/env node
/**
 * Self-test for the test-discovery gate.
 *
 * The gate's whole job is noticing silence — a spec file that no glob matches.
 * A gate that also went silent would be indistinguishable from a healthy one,
 * so the cases below are the ones where a lazy implementation looks fine:
 * a subset check instead of an equality, and a parser that returns an empty
 * list for output it did not understand.
 */
import { compare, parseListTests } from './test-discovery.mjs';

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

const base = { project: 'core', hasTestTarget: true };

/* ── compare ─────────────────────────────────────────────────────────────── */
check(
  'discovery matching the files on disk passes',
  compare({ ...base, onDisk: ['a.spec.ts', 'b.spec.ts'], discovered: ['a.spec.ts', 'b.spec.ts'] })
    .length === 0,
);

{
  const f = compare({ ...base, onDisk: ['a.spec.ts', 'b.spec.ts'], discovered: ['a.spec.ts'] });
  check(
    'A SPEC THAT IS NEVER RUN FAILS — the reason this gate exists',
    f.length === 1 && f[0]?.kind === 'unrun' && (f[0]?.files ?? []).includes('b.spec.ts'),
    f.length === 0 ? 'the silent skip was accepted' : `reported ${f[0]?.kind}`,
  );
}

{
  // The `../**` leak, as it actually happened.
  const f = compare({
    ...base,
    project: 'button',
    onDisk: ['packages/button/src/lib/b.spec.ts'],
    discovered: ['packages/button/src/lib/b.spec.ts', 'packages/core/src/lib/c.spec.ts'],
  });
  check(
    'a glob reaching into another package fails',
    f.length === 1 && f[0]?.kind === 'foreign',
    f.length === 0 ? 'the leak was accepted' : `reported ${f[0]?.kind}`,
  );
}

check(
  'a package with no behaviour to test needs no test target',
  compare({ project: 'theme', hasTestTarget: false, onDisk: [], discovered: [] }).length === 0,
);

{
  const f = compare({
    project: 'theme',
    hasTestTarget: false,
    onDisk: ['packages/theme/src/lib/x.spec.ts'],
    discovered: [],
  });
  check(
    'but spec files with NO test target at all fail',
    f.length === 1 && f[0]?.kind === 'orphaned',
    f.length === 0 ? 'tests that have never run were accepted' : 'reported orphaned',
  );
}

{
  // Both directions at once — a rename that moved a spec and widened a glob.
  const f = compare({ ...base, onDisk: ['a.spec.ts'], discovered: ['z.spec.ts'] });
  check(
    'unrun and foreign are reported together, not one masking the other',
    f.length === 2 && new Set(f.map((x) => x.kind)).size === 2,
  );
}

/* ── parseListTests ──────────────────────────────────────────────────────── */
{
  const r = parseListTests(
    'Discovered test files:\n  packages/core/a/x.spec.ts\n  packages/core/b/y.spec.ts\n\n\n NX  Successfully ran\n',
  );
  check(
    'the real output shape parses',
    r.ok && r.files.length === 2 && r.files[1] === 'packages/core/b/y.spec.ts',
  );
}
{
  const r = parseListTests('[37mDiscovered test files:[39m\n[37m  packages/core/a/x.spec.ts[39m\n');
  check('ANSI colour codes are stripped', r.ok && r.files[0] === 'packages/core/a/x.spec.ts');
}
{
  const r = parseListTests('some unrelated output\nwith no header at all\n');
  check(
    'output it does not understand is an ERROR, not an empty list',
    !r.ok,
    r.ok ? 'returned [] — every spec would look unrun for the wrong reason' : 'refused to guess',
  );
}
{
  const r = parseListTests('No test files found.\n');
  check('a genuinely empty project parses as empty', r.ok && r.files.length === 0);
}

if (failed > 0) {
  console.error(`\n${failed} test-discovery self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ The discovery gate catches skipped specs, leaked specs, and orphaned specs.');
