#!/usr/bin/env node
/**
 * TEKAD CI gate 9 — package validation.
 *
 * Every check here exists because the failure it catches is invisible in the
 * repository and only shows up in a consumer's project, often months later.
 * Two of them were written *after* the thing they check had already gone wrong
 * in this repo on the first build:
 *
 *   COMPILATION MODE. ng-packagr reads `tsConfig.options.compilationMode ||
 *   'full'`, so a library tsconfig that simply omits the setting silently
 *   produces a FULL-compiled package. Full compilation bakes the current
 *   Angular version's private instruction set into the output, and the package
 *   then breaks on a later Angular that changed those internals. ng-packagr
 *   does inject a `prepublishOnly` script that aborts the publish, but that
 *   fires at the last possible moment, on a release day. This asserts it at
 *   build time.
 *
 *   INTERNAL PATH LEAKAGE. ADR-004 rule 4: consumers never import an internal
 *   path. ng-packagr emits no wildcard subpath, so `./src/*` is unimportable
 *   *by default* — which means the job here is to notice if that ever stops
 *   being true, not to create the property.
 *
 * Run against the BUILT output, never the source. What the source says is an
 * intention; what `dist/` says is what a consumer receives.
 *
 * Usage: node tools/verify-package-format.mjs [distDir]
 * Exit 0 = every built package is publishable. Exit 1 = at least one is not.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'dist/packages');

/** @type {string[]} */
const failures = [];
/** @type {string[]} */
const notes = [];

/**
 * @param {string} pkgDir
 * @param {string} name
 * @param {string} msg
 */
function fail(pkgDir, name, msg) {
  failures.push(`${name}: ${msg}`);
  void pkgDir;
}

if (!existsSync(DIST)) {
  console.error(`verify-package-format: ${DIST} does not exist. Run \`pnpm build\` first.`);
  process.exit(1);
}

const pkgDirs = readdirSync(DIST)
  .map((d) => join(DIST, d))
  .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'package.json')));

if (pkgDirs.length === 0) {
  console.error(`verify-package-format: no built packages under ${DIST}.`);
  process.exit(1);
}

/**
 * The subset of a built package.json this gate reasons about. Named fields
 * rather than an index signature: with `noPropertyAccessFromIndexSignature` the
 * latter forces bracket access everywhere, and it would also silently accept a
 * typo like `sideEffect` as a valid lookup.
 *
 * @typedef {{
 *   name?: string,
 *   type?: string,
 *   module?: string,
 *   types?: string,
 *   typings?: string,
 *   sideEffects?: boolean | string[],
 *   private?: boolean,
 *   scripts?: { prepublishOnly?: string } & Record<string, string>,
 *   exports?: Record<string, unknown>,
 *   peerDependencies?: Record<string, string>,
 * }} BuiltManifest
 */

for (const dir of pkgDirs) {
  /** @type {BuiltManifest} */
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const name = pkg.name ?? dir;

  /* ---- 1. compilation mode ------------------------------------------------
   * ng-packagr signals full compilation by injecting a prepublishOnly script
   * that aborts. Its presence is the tell. The FESM is checked independently so
   * the gate does not depend on ng-packagr keeping that behaviour. */
  if (pkg.scripts?.prepublishOnly) {
    fail(
      dir,
      name,
      'was built in FULL compilation mode (ng-packagr injected a publish-blocking ' +
        'prepublishOnly script). Set angularCompilerOptions.compilationMode = "partial" ' +
        'in the package tsconfig.lib.json.',
    );
  }

  const fesmDir = join(dir, 'fesm2022');
  if (existsSync(fesmDir)) {
    for (const f of readdirSync(fesmDir).filter((f) => f.endsWith('.mjs'))) {
      const code = readFileSync(join(fesmDir, f), 'utf8');
      // Full compilation emits ɵɵdefineComponent / ɵɵdefineDirective directly;
      // partial emits ɵɵngDeclare* which the consumer's compiler links.
      if (/ɵɵdefine(Component|Directive|Pipe|NgModule)\b/.test(code)) {
        fail(
          dir,
          name,
          `fesm2022/${f} contains fully-compiled Angular definitions (ɵɵdefine*). ` +
            'A published library must emit partial ɵɵngDeclare* output.',
        );
        break;
      }
    }
  } else {
    fail(dir, name, 'has no fesm2022/ output.');
  }

  /* ---- 2. exports map ---------------------------------------------------- */
  if (!pkg.exports) {
    fail(dir, name, 'has no "exports" map, so its public surface is not enforced.');
  } else {
    if (!pkg.exports['.']) fail(dir, name, 'has no "." entry in its exports map.');
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (subpath.includes('*')) {
        fail(
          dir,
          name,
          `exports a WILDCARD subpath "${subpath}". ADR-004 rule 4: consumers never ` +
            'import an internal path, and a wildcard hands them every internal file.',
        );
      }
      if (/(^|\/)(src|internal)(\/|$)/.test(subpath)) {
        fail(dir, name, `exports an internal path "${subpath}".`);
      }
      if (subpath !== './package.json' && typeof target === 'object' && target !== null) {
        const conditions = /** @type {Record<string, unknown>} */ (target);
        if (!conditions['types']) {
          fail(dir, name, `exports "${subpath}" without a "types" condition.`);
        }
      }
    }
  }

  /* ---- 3. sideEffects ------------------------------------------------------
   * ADR-004 rule 5. An absent or `true` value tells every bundler to keep the
   * whole module graph, which is the single most effective way to make an
   * entry-point split buy nothing. */
  if (pkg.sideEffects !== false) {
    fail(
      dir,
      name,
      `declares sideEffects: ${JSON.stringify(pkg.sideEffects)}. It must be exactly false ` +
        '— an absent or true value disables tree-shaking for the whole package.',
    );
  }

  /* ---- 4. ESM and types ---------------------------------------------------- */
  if (pkg.type !== 'module')
    fail(dir, name, `declares type: ${JSON.stringify(pkg.type)}, not "module".`);
  if (!pkg.module && !pkg.exports?.['.']) fail(dir, name, 'has no ESM entry.');
  if (!pkg.typings && !pkg.types) fail(dir, name, 'declares no types entry.');

  /* ---- 5. no source or map leakage ----------------------------------------- */
  if (existsSync(join(dir, 'src'))) {
    fail(dir, name, 'ships a src/ directory. Published output is build artefacts only.');
  }

  /* ---- 6. peer dependencies must be ranges, not exact pins ------------------
   * An exact peer pin forces every consumer onto one Angular patch release and
   * makes two TEKAD packages uninstallable together the moment they disagree.
   * Workspace-internal peers are exempt: those move together by construction. */
  for (const [dep, range] of Object.entries(pkg.peerDependencies ?? {})) {
    if (dep.startsWith('@tekad/')) continue;
    if (/^\d/.test(String(range))) {
      fail(dir, name, `pins peer "${dep}" to the exact version ${range}; use a range.`);
    }
  }

  /* ---- 7. publish safety (ADR-016) ---------------------------------------- */
  if (pkg.private !== true) {
    notes.push(
      `${name}: "private" is not true. That is correct only once ADR-016's namespace and ` +
        'trademark gates have passed — until then a package must be impossible to publish ' +
        'by accident.',
    );
  }
}

/* -------------------------------- report ---------------------------------- */
console.log(`Package format — ${pkgDirs.length} built package(s) checked in ${DIST}\n`);

if (notes.length) {
  for (const n of notes) console.warn(`! ${n}`);
  console.warn('');
}

if (failures.length) {
  console.error('✗ Package validation failed:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('\nSee ADR-004 and docs/architecture/02-public-api-rules.md.');
  process.exit(1);
}

console.log('✓ Every built package is partial-compiled, ESM, typed, side-effect-free,');
console.log('  and exposes no internal or wildcard path.');
