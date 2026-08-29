#!/usr/bin/env node
/**
 * Self-test for the ADR-002 / ADR-003 reactive-discipline lint rules.
 *
 * Each rule encodes something an ADR lists verbatim as a review blocker, and
 * each is a `no-restricted-syntax` AST selector — which is exactly the kind of
 * rule that silently stops matching when a selector is edited, an AST shape
 * changes, or the file glob drifts. A rule that no longer fires looks identical
 * to a codebase that has no violations.
 *
 * So every rule is pinned from both sides:
 *
 *   a VIOLATION fixture that must be reported, with the right rule, and
 *   an ALLOWED fixture that must NOT be reported.
 *
 * The allowed cases matter as much as the violations. ADR-003 permits a
 * `Subject` that models an event stream while rejecting a `BehaviorSubject`
 * that holds state; ADR-002 permits `effect()` for DOM and focus while
 * rejecting it as an assignment. A rule that failed to make those distinctions
 * would be enforcing something the ADRs never said.
 *
 * Fixtures are stored as `*.ts.fixture` so the compiler never sees them; each
 * is copied into `packages/` for one lint run — the rules are scoped there on
 * purpose — and removed afterwards.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FIX = join(HERE, '__fixtures__/reactive');
// The rules are scoped to packages/**; the fixture must live there to be seen.
const SANDBOX = join(ROOT, 'packages/__reactive-fixture__');

/** @param {string} relPath */
function lint(relPath) {
  const r = spawnSync(
    process.execPath,
    [join(ROOT, 'node_modules/eslint/bin/eslint.js'), relPath],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/** @type {{name: string, fixture: string, expectReport: boolean, expectMessage?: RegExp}[]} */
const cases = [
  {
    name: 'ADR-004: an NgModule in a package → REPORTED',
    fixture: 'ngmodule.ts.fixture',
    expectReport: true,
    expectMessage: /NgModules are not a TEKAD public API/,
  },
  {
    name: 'ADR-005: an @angular/aria/private import → REPORTED',
    fixture: 'aria-private.ts.fixture',
    expectReport: true,
    expectMessage: /no compatibility guarantee/,
  },
  {
    name: 'ADR-005: a PUBLIC @angular/aria entry point → allowed',
    fixture: 'allowed-aria-public.ts.fixture',
    expectReport: false,
  },
  {
    name: 'ADR-003: a BehaviorSubject holding state → REPORTED',
    fixture: 'state-subject.ts.fixture',
    expectReport: true,
    expectMessage: /second source of truth/,
  },
  {
    name: 'ADR-003: a plain Subject modelling an event stream → allowed',
    fixture: 'allowed-event-subject.ts.fixture',
    expectReport: false,
  },
  {
    name: 'ADR-002: writing a signal inside effect() → REPORTED',
    fixture: 'effect-write.ts.fixture',
    expectReport: true,
    expectMessage: /never to copy one reactive value into another/,
  },
  {
    name: 'ADR-002: effect() touching the DOM → allowed',
    fixture: 'allowed-effect-side-effect.ts.fixture',
    expectReport: false,
  },
  {
    name: 'ADR-002: the same derivation written as computed() → allowed',
    fixture: 'allowed-computed.ts.fixture',
    expectReport: false,
  },
  {
    name: 'ADR-002: a toSignal(toObservable(x)) round-trip → REPORTED',
    fixture: 'round-trip.ts.fixture',
    expectReport: true,
    expectMessage: /round-trip/,
  },
  {
    name: 'ADR-003: subscribe-then-set by hand → REPORTED',
    fixture: 'manual-subscribe.ts.fixture',
    expectReport: true,
    expectMessage: /teardown bookkeeping/,
  },
  {
    name: 'ADR-003: toObservable at the boundary and toSignal once, at the edge → allowed',
    fixture: 'allowed-boundary-adapter.ts.fixture',
    expectReport: false,
  },
];

let failed = 0;
mkdirSync(SANDBOX, { recursive: true });

try {
  for (const c of cases) {
    const target = join(SANDBOX, 'fixture.ts');
    copyFileSync(join(FIX, c.fixture), target);

    const { out } = lint('packages/__reactive-fixture__/fixture.ts');
    const reported = /no-restricted-syntax|no-restricted-imports/.test(out);
    let ok = reported === c.expectReport;
    if (ok && c.expectMessage) ok = c.expectMessage.test(out);

    console.log(`${ok ? '✓' : '✗'} ${c.name}`);
    if (!ok) {
      failed++;
      console.error(
        `    expected ${c.expectReport ? 'a report' : 'no report'}` +
          (c.expectMessage ? ` matching ${c.expectMessage}` : '') +
          `\n    eslint said:\n${out
            .split('\n')
            .map((l) => '      ' + l)
            .join('\n')}`,
      );
    }
    rmSync(target, { force: true });
  }
} finally {
  if (existsSync(SANDBOX)) rmSync(SANDBOX, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(
    `\n${failed} reactive-rule self-test(s) failed — ADR-002/ADR-003 are not enforced.`,
  );
  process.exit(1);
}
console.log(
  '\n✓ Reactive-discipline rules fire on every violation and on none of the allowed forms.',
);
