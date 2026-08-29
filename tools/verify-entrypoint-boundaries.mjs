#!/usr/bin/env node
/**
 * TEKAD — no relative import may cross an entry-point boundary.
 *
 * Spike B found this by doing it: a relative import from one ng-packagr entry
 * point into another fails the build, correctly, but with
 *
 *     Cannot destructure property 'pos' of 'file.referencedFiles[index]'
 *     as it is undefined.
 *
 * Not "…is not part of any entry point". A contributor who does the natural
 * thing — reach for the file next door — gets an internal crash with no hint
 * about what they did. This gate produces the readable error first.
 *
 * The rule itself: an entry point is any directory containing `ng-package.json`,
 * and it owns every file beneath it until a nested `ng-package.json` takes over.
 * Code in one entry point reaches another through its PUBLIC package specifier
 * (`@tekad/core/primitives/identity`), never through `../../`. That is not a
 * stylistic preference — the published artefacts are separate FESM bundles, and
 * a relative path across them has no meaning once the package is installed.
 *
 * ── Why a script and not a custom ESLint rule ─────────────────────────────
 *
 * An ESLint rule would give in-editor feedback, which is genuinely better. It
 * would also mean publishing and versioning a plugin package to hold one rule,
 * before TEKAD has a single real component. That is the speculative abstraction
 * CLAUDE.md rule 9 exists to prevent. When there are enough repo-specific rules
 * to justify a plugin, this moves into it; the check is the same either way.
 *
 * Usage: node tools/verify-entrypoint-boundaries.mjs [packagesDir]
 * Exit 0 = clean. Exit 1 = a relative import crosses a boundary.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'packages');

/**
 * Walk a directory tree, yielding every `.ts` file.
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/**
 * The entry point that owns a file: its nearest ancestor holding an
 * `ng-package.json`, stopping at the packages root.
 * @param {string} file
 * @returns {string | null}
 */
function owningEntryPoint(file) {
  let dir = dirname(file);
  while (dir.startsWith(PACKAGES)) {
    if (existsSync(join(dir, 'ng-package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Matches the module specifier of a static import/export, single or double quoted. */
const SPECIFIER = /(?:^|\n)\s*(?:import|export)\b[^'"\n]*?from\s*['"]([^'"]+)['"]/g;
/** Bare side-effect imports: `import './x';` */
const SIDE_EFFECT = /(?:^|\n)\s*import\s*['"](\.[^'"]+)['"]/g;

/** @type {{file: string, specifier: string, from: string, to: string}[]} */
const violations = [];
let filesChecked = 0;
let entryPointsSeen = new Set();

for (const file of walk(PACKAGES)) {
  const owner = owningEntryPoint(file);
  if (!owner) continue; // not inside any entry point — nothing to police
  filesChecked++;
  entryPointsSeen.add(owner);

  const text = readFileSync(file, 'utf8');
  /** @type {string[]} */
  const specifiers = [];
  for (const m of text.matchAll(SPECIFIER)) if (m[1]) specifiers.push(m[1]);
  for (const m of text.matchAll(SIDE_EFFECT)) if (m[1]) specifiers.push(m[1]);

  for (const spec of specifiers) {
    if (!spec.startsWith('.')) continue; // a package specifier is the sanctioned route
    const target = resolve(dirname(file), spec);
    const targetOwner = owningEntryPoint(target + '.ts');
    if (targetOwner && targetOwner !== owner) {
      violations.push({
        file: relative(ROOT, file),
        specifier: spec,
        from: relative(ROOT, owner),
        to: relative(ROOT, targetOwner),
      });
    }
  }
}

if (violations.length > 0) {
  console.error('\n✗ A relative import crosses an entry-point boundary.\n');
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    imports '${v.specifier}'`);
    console.error(`    which leaves entry point  ${v.from}`);
    console.error(`    and lands in              ${v.to}`);
    console.error('');
  }
  console.error(
    'Entry points are published as separate bundles, so a relative path between them\n' +
      'has no meaning once the package is installed. Import through the public specifier\n' +
      "instead (e.g. '@tekad/core/primitives/identity').\n\n" +
      'Left to ng-packagr this fails with an internal crash — "Cannot destructure property\n' +
      "'pos' of 'file.referencedFiles[index]'\" — which is why this gate runs first.\n" +
      'Evidence: docs/research/prototypes/spike-b-nx-angular-build/\n',
  );
  process.exit(1);
}

console.log(
  `✓ No relative import crosses an entry-point boundary ` +
    `(${filesChecked} file(s) across ${entryPointsSeen.size} entry point(s)).`,
);
