#!/usr/bin/env node
/**
 * Sets one version across every publishable package (fixed versioning).
 *
 *   node tools/set-version.mjs 0.2.0
 *
 * Updates packages/*\/package.json "version" and every @tekad/* peer range to
 * "^<version>", plus TEKAD_VERSION / TEKAD_FORMS_VERSION constants.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
  console.error('Usage: node tools/set-version.mjs <semver>');
  process.exit(1);
}
const root = new URL('..', import.meta.url).pathname;
for (const dir of readdirSync(join(root, 'packages'))) {
  const file = join(root, 'packages', dir, 'package.json');
  if (!existsSync(file)) continue;
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = version;
  for (const dep of Object.keys(pkg.peerDependencies ?? {})) {
    if (dep.startsWith('@tekad/')) pkg.peerDependencies[dep] = `^${version}`;
  }
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}
for (const [file, name] of [
  ['packages/core/src/lib/version.ts', 'TEKAD_VERSION'],
  ['packages/forms/src/index.ts', 'TEKAD_FORMS_VERSION'],
]) {
  const p = join(root, file);
  const src = readFileSync(p, 'utf8');
  writeFileSync(p, src.replace(new RegExp(`(${name}[^=]*=\\s*')[^']*(')`), `$1${version}$2`));
}
console.log(`All packages set to ${version}.`);
