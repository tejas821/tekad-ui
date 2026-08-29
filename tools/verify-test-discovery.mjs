#!/usr/bin/env node
/**
 * TEKAD — every spec file is actually run by exactly one project.
 *
 * A unit test that never runs is worse than no test: it reads as coverage, it
 * gets maintained, and it reports nothing. `@nx/angular:unit-test` discovers
 * specs by glob, so a spec is silently skipped whenever a new secondary entry
 * point lands outside the patterns someone wrote months earlier — and the suite
 * stays green while it happens.
 *
 * Measured, both directions of this are real:
 *
 *   - `../**\/*.spec.ts` from `packages/button/src` pulled in
 *     `packages/core`'s specs and broke the build. Loud, therefore harmless.
 *   - The same class of mistake in the other direction — a glob that matches
 *     nothing new — is completely silent.
 *
 * So the check is an equality, not a subset: what the executor discovers must
 * be exactly the spec files on disk under that package.
 *
 * Usage: node tools/verify-test-discovery.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, parseListTests } from './lib/test-discovery.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');

/** @param {string} dir @returns {string[]} */
function specsUnder(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...specsUnder(p));
    else if (p.endsWith('.spec.ts')) out.push(relative(ROOT, p));
  }
  return out;
}

const projects = readdirSync(PACKAGES)
  .map((name) => ({ name, dir: join(PACKAGES, name) }))
  .filter((p) => existsSync(join(p.dir, 'project.json')));

let failed = 0;
let checked = 0;

console.log('TEKAD test discovery — is every spec file actually run?\n');

for (const p of projects) {
  const config = JSON.parse(readFileSync(join(p.dir, 'project.json'), 'utf8'));
  const projectName = config.name ?? p.name;
  const hasTestTarget = Boolean(config.targets?.test);
  const onDisk = specsUnder(p.dir).sort();

  /** @type {string[]} */
  let discovered = [];
  if (hasTestTarget) {
    const r = spawnSync('pnpm', ['exec', 'nx', 'test', projectName, '--listTests'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const parsed = parseListTests((r.stdout ?? '') + (r.stderr ?? ''));
    if (!parsed.ok) {
      console.log(`✗ ${projectName}\n    ${parsed.reason}`);
      failed++;
      continue;
    }
    discovered = parsed.files.sort();
  }

  const findings = compare({ project: projectName, hasTestTarget, onDisk, discovered });
  checked++;

  if (findings.length === 0) {
    const note = hasTestTarget
      ? `${discovered.length} spec file(s), all discovered`
      : 'no test target, and no spec files to orphan';
    console.log(`✓ ${projectName} — ${note}`);
    continue;
  }

  failed++;
  console.log(`✗ ${projectName}`);
  for (const f of findings) {
    console.log(`    ${f.why}:`);
    for (const file of f.files) console.log(`      ${file}`);
  }
}

if (failed > 0) {
  console.error(
    `\n✗ ${failed} project(s) do not run the specs they contain.\n\n` +
      "Fix the `include` globs in the project's test target. They resolve against\n" +
      "the project's SOURCE ROOT, and `../**` reaches beyond the package — name the\n" +
      'entry-point directories explicitly instead (`../a11y/**/*.spec.ts`).\n',
  );
  process.exit(1);
}

console.log(`\n✓ ${checked} project(s): every spec on disk is run, and nothing foreign is.`);
