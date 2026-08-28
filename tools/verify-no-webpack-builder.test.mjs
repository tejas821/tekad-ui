#!/usr/bin/env node
/**
 * Self-test for tools/verify-no-webpack-builder.mjs.
 *
 * A guard that cannot fail is not a guard. The first version of that script
 * used a substring match and went red on a perfectly clean lockfile, because
 * `@nx/angular` DECLARES the banned package as an optional peer. Both directions
 * are pinned here so a future "simplification" of the matcher is caught.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-no-webpack-builder.mjs');

const cases = [
  {
    name: 'a lockfile that RESOLVES the banned package must FAIL',
    fixture: 'lock-with-builder.yaml',
    expectExit: 1,
  },
  {
    name: 'the banned name appearing ONLY as another package’s optional peer must PASS',
    fixture: 'lock-peer-declaration-only.yaml',
    expectExit: 0,
  },
  {
    name: "this workspace's real lockfile must PASS",
    fixture: null,
    expectExit: 0,
  },
];

let failed = 0;
for (const c of cases) {
  const args = c.fixture ? [SCRIPT, join(HERE, '__fixtures__', c.fixture)] : [SCRIPT];
  const { status } = spawnSync(process.execPath, args, { stdio: 'ignore' });
  const ok = status === c.expectExit;
  console.log(`${ok ? '✓' : '✗'} ${c.name}  (exit ${status}, expected ${c.expectExit})`);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} self-test(s) failed — the webpack-builder guard is not trustworthy.`);
  process.exit(1);
}
console.log(
  '\n✓ webpack-builder guard self-test passed (fails on a real resolution, passes on a peer declaration).',
);
