#!/usr/bin/env node
/**
 * Self-test for tools/verify-forms-contracts.mjs.
 *
 * This gate matters more than most, because the thing it guards against
 * produces no error of its own. Measured in Angular 22.1.4, a control that
 * implements both forms contracts compiles, boots, renders, and silently
 * ignores its signal-forms value model. If this gate stopped firing, nothing
 * else in the toolchain would notice.
 *
 * The `illegal-provider` fixture is the one worth reading: it never writes the
 * word `ControlValueAccessor`. It just provides `NG_VALUE_ACCESSOR`, which is
 * enough to register a CVA and lose the binding. A gate that only looked at
 * `implements` clauses would pass it.
 *
 * The `legal` fixture holds a signal-forms control AND a separate CVA adapter
 * in the same package — the sanctioned shape from ADR-013. A rule that rejected
 * that would make the compat entry point impossible to write.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-forms-contracts.mjs');
const FIX = join(HERE, '__fixtures__/forms');
const ROOT = join(HERE, '..');

/** @param {string} dir */
function run(dir) {
  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

const cases = [
  {
    name: 'a signal-forms control AND a separate CVA adapter in one package → PASS',
    dir: join(FIX, 'legal'),
    expectExit: 0,
  },
  {
    name: 'one class implementing BOTH contracts → FAIL',
    dir: join(FIX, 'illegal-implements'),
    expectExit: 1,
    expectMatch: /implements ControlValueAccessor alongside/,
  },
  {
    name: 'a class that provides NG_VALUE_ACCESSOR without naming the interface → FAIL',
    dir: join(FIX, 'illegal-provider'),
    expectExit: 1,
    expectMatch: /provides NG_VALUE_ACCESSOR/,
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
  console.error(`\n${failed} forms-contract self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log(
  '\n✓ Forms-contract gate catches both routes to a CVA, and permits the sanctioned shape.',
);
