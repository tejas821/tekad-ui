#!/usr/bin/env node
/**
 * TEKAD CI gate — `@angular-devkit/build-angular` must not enter the tree.
 *
 * Angular's webpack builder is deprecated in v22. Spike B proved that no TEKAD
 * build path touches it: with the package physically removed from node_modules,
 * both the ng-packagr library build and the `@angular/build:application` app
 * build still succeeded.
 *
 * But Spike B also found it arriving *anyway* — declared by Nx's Angular
 * template, and pulled as an OPTIONAL PEER of `@nx/angular` and of the
 * vitest-analog test runner. Optional peers are exactly the kind of dependency
 * that reappears silently when someone adds a test runner.
 *
 * So the absence is asserted here rather than assumed. This is a lockfile fact,
 * checked on every CI run, not a habit.
 *
 * See ADR-012 and docs/research/prototypes/spike-b-nx-angular-build/.
 *
 * Exit 0 = clean. Exit 1 = the deprecated builder is in the tree.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANNED = '@angular-devkit/build-angular';

/** @type {string[]} */
const failures = [];

/* ---- 1. It must not be DECLARED anywhere in the workspace. --------------- */
const manifests = ['package.json'];
const wsFile = join(ROOT, 'pnpm-workspace.yaml');
if (existsSync(wsFile)) {
  // Deliberately not adding a YAML parser for four lines of globs; the glob
  // roots are read directly and any package.json under them is checked.
  const globs = readFileSync(wsFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).replace(/['"]/g, ''));
  const { globSync } = await import('node:fs');
  for (const g of globs) {
    for (const dir of globSync(g, { cwd: ROOT })) {
      const p = join(dir, 'package.json');
      if (existsSync(join(ROOT, p))) manifests.push(p);
    }
  }
}

for (const rel of manifests) {
  const pkg = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    if (pkg[field]?.[BANNED]) {
      failures.push(`${rel} declares ${BANNED} in "${field}" (${pkg[field][BANNED]})`);
    }
  }
}

/* ---- 2. It must not be RESOLVED in the committed lockfile. ---------------
 *
 * Not every mention is a resolution. `@nx/angular` DECLARES the banned package
 * as an optional peer, so its name appears inside `peerDependencies:` blocks in
 * a perfectly clean lockfile. Failing on a substring match would make this gate
 * permanently red and therefore worthless.
 *
 * A real resolution looks different in both places it can appear:
 *   - `packages:` / `snapshots:` keys are VERSION-SUFFIXED —
 *       '@angular-devkit/build-angular@22.0.6':
 *   - an `importers:` entry is the bare name followed by a `specifier:` line.
 * A peer DECLARATION is the bare name followed by a version RANGE on the same
 * line, and never carries an `@version` suffix.
 */
const lock = process.argv[2] ?? join(ROOT, 'pnpm-lock.yaml');
if (!existsSync(lock)) {
  console.error(`verify-no-webpack-builder: ${lock} is missing — run \`pnpm install\` first.`);
  process.exit(1);
}
const lines = readFileSync(lock, 'utf8').split('\n');

const resolved = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i] ?? '';
  if (!line.includes(BANNED)) continue;

  // A version-suffixed key is always a real resolution.
  if (new RegExp(`(^|[\\s'"])${BANNED.replace('/', '\\/')}@`).test(line)) {
    resolved.push({ line: i + 1, why: 'resolved package entry', text: line.trim() });
    continue;
  }

  // A bare name whose following line declares a `specifier:` is an importer
  // dependency — i.e. something in this workspace actually asked for it.
  const isKey = new RegExp(`^\\s*'?${BANNED.replace('/', '\\/')}'?\\s*:\\s*$`).test(line);
  if (isKey && /^\s*specifier:/.test(lines[i + 1] ?? '')) {
    resolved.push({ line: i + 1, why: 'workspace importer dependency', text: line.trim() });
  }
  // Anything else is a peer declaration by another package. Not a failure.
}

if (resolved.length > 0) {
  for (const r of resolved) {
    failures.push(`${lock}: ${r.why} at line ${r.line} — ${r.text}`);
  }
}

/* ---- 3. It must not be INSTALLED on disk. -------------------------------- */
if (existsSync(join(ROOT, 'node_modules', BANNED))) {
  failures.push(`node_modules/${BANNED} exists on disk`);
}

/* ---- report -------------------------------------------------------------- */
if (failures.length > 0) {
  console.error(
    `\n✗ ${BANNED} is Angular's DEPRECATED webpack builder and must stay out of TEKAD.\n`,
  );
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\n  It is an optional peer of @nx/angular and of some test runners, so it can arrive\n' +
      '  without being asked for. If a tool genuinely requires it, that is an ADR-012\n' +
      '  reopen, not a lockfile edit.\n' +
      '  Evidence: docs/research/prototypes/spike-b-nx-angular-build/\n',
  );
  process.exit(1);
}

console.log(`✓ ${BANNED} is absent from manifests, lockfile and node_modules.`);
