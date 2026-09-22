#!/usr/bin/env node
/**
 * TEKAD CI gate 9, second instalment — package validation at the packed level.
 *
 * `verify-package-format.mjs` reads `dist/packages/*`, the directory ng-packagr
 * wrote. `verify-treeshaking.mjs` reads a bundle. Neither has ever read the one
 * artefact a consumer actually receives: the tarball `npm publish` uploads.
 * ADR-012 names this layer explicitly — "the packed-tarball import probe is the
 * only check that sees what a consumer actually receives" — and it is the layer
 * where a file can be *in* the package and unreachable, because the exports map
 * is what makes a path a public path, and nothing before this gate ran a
 * resolver against it.
 *
 * That is not a hypothetical here. On its first run this gate found
 * `@tekad/theme/styles/tekad.css` — the file the README, the package
 * description, `src/index.ts` and `docs/architecture/10-design-tokens-and-theme.md`
 * all call *the* shipped artefact of that package — shipping inside the tarball
 * and refused by every resolver that honours `exports`, which is Node, Vite,
 * webpack 5, esbuild, and Angular's own builder. Nothing had ever resolved a
 * specifier against the published package, so nothing could notice.
 *
 * ── What it proves, in order of increasing strength ───────────────────────
 *
 *   1. The tarball's file set is exactly what npm reported (see tarball.mjs).
 *   2. Every file in it is either reachable through the exports map, or is a
 *      source map, or is the manifest. A file that is shipped and importable by
 *      nobody is either a mistake or an undocumented path; both are findings.
 *   3. Every public specifier RESOLVES, from a scratch consumer, through the
 *      tarball's own exports map — and resolves to a file that is really there.
 *   4. Every internal specifier is REFUSED: `./src/*` and the raw `fesm2022/*`
 *      path are not public, and a resolver that starts serving them is a
 *      release-visible change. An absence proves nothing on its own, so the
 *      same run proves the resolution mechanism works (3).
 *   5. The declarations resolve. A `types` condition is a claim about a file
 *      path until TypeScript goes through the exports map and finds it, so a
 *      scratch consumer imports every entry point and is type-checked.
 *   6. Every bare import in the shipped code is a declared peer or dependency,
 *      and everything declared as a runtime dependency is imported by something
 *      that ships. Both directions have bitten libraries: the first is a
 *      phantom dependency that only fails for the consumer, the second is dead
 *      weight every consumer installs and never uses.
 *
 * The peer dependencies of the scratch consumer come from this workspace — a
 * real consumer installs Angular themselves. The `@tekad/*` packages come only
 * from the tarballs, which is the point.
 *
 * Usage: node tools/verify-consumer-boundary.mjs [distDir]
 *   distDir defaults to dist/packages. When it is given explicitly the
 *   source-set check below is skipped; that is how the self-test drives it with
 *   synthetic packages.
 * Exit 0 = what a consumer receives works. Exit 1 = at least one finding.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pack, extract } from './lib/tarball.mjs';

/** @typedef {import('./lib/tarball.mjs').BuiltManifest} BuiltManifest */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIST = join(ROOT, 'dist/packages');
const distArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const DIST = distArg ? resolve(distArg) : DEFAULT_DIST;
const KEEP = process.argv.includes('--keep');

/**
 * Runtime dependencies ng-packagr injects into every package it writes,
 * whatever the source says.
 *
 * `write-package.transform.js` reads the version out of `@angular/compiler`'s
 * own dependencies and adds `tslib` unless it is already declared. So it is in
 * every TEKAD tarball, and no TEKAD source imports it — the emitted FESM
 * contains no tslib import at all, because the code uses no TypeScript helpers.
 * Recorded here rather than silently exempted: an unexplained exception in a
 * gate is how the next real one gets waved through.
 */
const INJECTED_DEPENDENCIES = ['tslib'];

/** A map or the manifest itself is not something a specifier can name. */
const NOT_A_PUBLIC_PATH = ['.map', 'package.json'];

/** @type {string[]} */
const failures = [];
/** @type {string[]} */
const notes = [];

/** @param {string} msg */
function fail(msg) {
  failures.push(msg);
}

/* ------------------------------- 1. the packages --------------------------- */

if (!existsSync(DIST)) {
  console.error(`verify-consumer-boundary: ${DIST} does not exist. Run \`pnpm build\` first.`);
  process.exit(1);
}

const dirs = readdirSync(DIST)
  .map((d) => join(DIST, d))
  .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'package.json')));

if (dirs.length === 0) {
  console.error(`verify-consumer-boundary: no built packages under ${DIST}.`);
  process.exit(1);
}

/*
 * A probe that silently measures one package fewer is a probe that reports
 * success having checked less. Every package the workspace declares must be
 * present in dist, or this says which one is missing.
 *
 * Only for the default dist: the self-test's fixture packages are not in
 * `packages/` at all.
 */
if (!distArg) {
  const declared = readdirSync(join(ROOT, 'packages'))
    .map((d) => join(ROOT, 'packages', d, 'package.json'))
    .filter((p) => existsSync(p))
    .map((p) => JSON.parse(readFileSync(p, 'utf8')).name);
  const built = dirs.map((d) => JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).name);
  for (const name of declared) {
    if (!built.includes(name)) fail(`${name} is declared in packages/ but was not built.`);
  }
}

/* ---------------------------- 2. pack and extract -------------------------- */

const scratch = mkdtempSync(join(tmpdir(), 'tekad-consumer-'));
const consumer = join(scratch, 'consumer');
const packDir = join(scratch, 'pack');
/** @type {import('./lib/tarball.mjs').PackedPackage[]} */
const packages = [];

try {
  for (const dir of dirs) packages.push(pack(dir, packDir));

  /*
   * Peers, from the workspace. A consumer's own node_modules holds Angular,
   * rxjs and tslib; simulating that is what separates "does TEKAD's package
   * resolve" from "does TEKAD's package resolve next to nothing".
   */
  const consumerModules = join(consumer, 'node_modules');
  for (const entry of readdirSync(join(ROOT, 'node_modules'))) {
    if (entry === '@tekad' || entry === '.pnpm' || entry.startsWith('.')) continue;
    if (entry === 'typescript') continue;
    const from = join(ROOT, 'node_modules', entry);
    if (!statSync(from).isDirectory()) continue;
    const to = join(consumerModules, entry);
    if (existsSync(to)) continue;
    spawnSync('ln', ['-s', from, to]);
  }

  const tekadScope = join(consumerModules, '@tekad');
  for (const pkg of packages) {
    const root = join(tekadScope, basename(pkg.name.replace('@tekad/', '')));
    extract(pkg.entries, root);
  }
} catch (e) {
  console.error(`verify-consumer-boundary: ${String(e)}`);
  process.exit(1);
}

/* ------------------------------ 3. the checks ------------------------------ */

/** @type {{ specifier: string, kind: 'script' | 'asset' }[]} */
const publicSpecifiers = [];
/** @type {string[]} */
const internalSpecifiers = [];

for (const pkg of packages) {
  const root = join(consumer, 'node_modules', '@tekad', basename(pkg.name.replace('@tekad/', '')));
  const shipped = new Set(pkg.files.map((f) => f.path));
  /** @type {BuiltManifest} */
  const manifest = pkg.manifest;
  const exportsMap = manifest.exports ?? {};

  if (Object.keys(exportsMap).length === 0) {
    fail(`${pkg.name}: the tarball's package.json has no exports map.`);
    continue;
  }

  /** Every path an exports entry names, so nothing shipped-but-unreachable slips by. */
  const reachable = new Set();
  for (const [subpath, target] of Object.entries(exportsMap)) {
    if (subpath.includes('*')) {
      fail(`${pkg.name}: exports the wildcard subpath "${subpath}".`);
      continue;
    }
    const conditions =
      typeof target === 'string'
        ? { default: target }
        : /** @type {Record<string, string>} */ (target);
    for (const [condition, value] of Object.entries(conditions)) {
      if (typeof value !== 'string') continue;
      const rel = value.replace(/^\.\//, '');
      if (rel === 'package.json') continue;
      reachable.add(rel);
      if (!shipped.has(rel)) {
        fail(`${pkg.name}: exports "${subpath}" -> "./${rel}", which is not in the tarball.`);
      }
      if (condition === 'types' && !rel.endsWith('.d.ts')) {
        fail(`${pkg.name}: exports "${subpath}" with a types condition pointing at "${rel}".`);
      }
    }
    if (subpath === './package.json') continue;
    /*
     * A subpath naming a `.mjs`/`.js` file is a script and must type-check. A
     * subpath naming anything else — the theme's stylesheet, its DTCG metadata —
     * is an asset: it is proved by resolving and by being in the tarball, and
     * asking TypeScript to import it would be asking the consumer's bundler to
     * declare CSS modules on the library's behalf. The kind is derived from the
     * target that is actually shipped, not from a list kept here.
     */
    const isScript = Object.values(conditions).some(
      (v) => typeof v === 'string' && /\.(mjs|cjs|js|jsx|d\.ts)$/.test(v),
    );
    publicSpecifiers.push({
      specifier: subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`,
      kind: isScript ? 'script' : 'asset',
    });
  }

  /*
   * The rule that found the theme's stylesheet: a shipped file is either
   * reachable through the exports map, or it is a source map, or it is the
   * manifest. Anything else is in a consumer's node_modules and importable by
   * nobody.
   */
  for (const file of shipped) {
    if (NOT_A_PUBLIC_PATH.some((suffix) => file.endsWith(suffix))) continue;
    if (reachable.has(file)) continue;
    fail(
      `${pkg.name}: ships "${file}", which no exports subpath names. A consumer cannot ` +
        `resolve it: bundlers and Node both refuse an unexported path.`,
    );
  }

  /* The negative direction. */
  const firstFesm = pkg.files.find(
    (f) => f.path.startsWith('fesm2022/') && f.path.endsWith('.mjs'),
  );
  internalSpecifiers.push(`${pkg.name}/src/index.ts`);
  internalSpecifiers.push(`${pkg.name}/package.json`);
  if (firstFesm) internalSpecifiers.push(`${pkg.name}/${firstFesm.path}`);
  internalSpecifiers.push(`${pkg.name}/this-subpath-does-not-exist`);

  /* The manifest, as shipped. */
  if (manifest.scripts && Object.keys(manifest.scripts).length > 0) {
    fail(
      `${pkg.name}: the tarball declares lifecycle scripts ` +
        `(${Object.keys(manifest.scripts).join(', ')}). Published output must run nothing ` +
        'on install.',
    );
  }
  if (manifest.sideEffects !== false) {
    fail(`${pkg.name}: sideEffects is ${JSON.stringify(manifest.sideEffects)}, not false.`);
  }
  if (manifest.type !== 'module') {
    fail(`${pkg.name}: type is ${JSON.stringify(manifest.type)}, not "module".`);
  }
  if (manifest.private !== true) {
    notes.push(
      `${pkg.name}: "private" is not true. Correct only once ADR-016's namespace and trademark ` +
        'gates have passed.',
    );
  }

  /* Dependency hygiene, both directions, over the code that actually ships. */
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  /** @type {Set<string>} */
  const imported = new Set();
  for (const file of pkg.files) {
    if (!file.path.endsWith('.mjs')) continue;
    const code = readFileSync(join(root, file.path), 'utf8');
    for (const m of code.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1] ?? '';
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      imported.add(packageOf(spec));
    }
    for (const m of code.matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1] ?? '';
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      imported.add(packageOf(spec));
    }
  }
  for (const spec of imported) {
    if (!declared.has(spec)) {
      fail(
        `${pkg.name}: the shipped code imports "${spec}", which is not declared as a peer or a ` +
          'dependency. It resolves here only because this workspace has it.',
      );
    }
  }
  for (const dep of Object.keys(manifest.dependencies ?? {})) {
    if (imported.has(dep) || INJECTED_DEPENDENCIES.includes(dep)) continue;
    fail(
      `${pkg.name}: declares "${dep}" as a runtime dependency and no shipped file imports it. ` +
        'Every consumer installs it for nothing.',
    );
  }
}

/* -------------------- 4. resolution, from the consumer --------------------- */

const resolveScript = join(consumer, 'resolve.mjs');
/** @param {string[]} specifiers */
const writeScript = (specifiers) =>
  [
    'const out = [];',
    `for (const s of ${JSON.stringify(specifiers)}) {`,
    '  try { out.push({ s, resolved: import.meta.resolve(s) }); }',
    '  catch (e) { out.push({ s, error: e.code ?? String(e) }); }',
    '}',
    'console.log(JSON.stringify(out));',
  ].join('\n');

/**
 * @param {string[]} specifiers
 * @returns {{s: string, resolved?: string, error?: string}[]}
 */
function resolveAll(specifiers) {
  writeFileSync(resolveScript, writeScript(specifiers));
  const r = spawnSync(process.execPath, [resolveScript], { cwd: consumer, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`resolution probe failed:\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** @type {Map<string, {resolved?: string, error?: string}>} */
const resolution = new Map();
try {
  const all = publicSpecifiers.map((p) => p.specifier).concat(internalSpecifiers);
  for (const r of resolveAll(all)) {
    resolution.set(r.s, r);
  }
} catch (e) {
  console.error(`verify-consumer-boundary: ${String(e)}`);
  process.exit(1);
}

for (const { specifier: spec } of publicSpecifiers) {
  const r = resolution.get(spec);
  if (!r?.resolved) {
    fail(`${spec}: refused by the exports map (${r?.error ?? 'no result'}).`);
    continue;
  }
  const path = fileURLToPath(r.resolved);
  if (!path.startsWith(consumer + sep)) {
    fail(`${spec}: resolved to ${path}, outside the scratch consumer.`);
    continue;
  }
  if (!existsSync(path)) {
    fail(`${spec}: resolved to ${path}, which does not exist in the tarball.`);
  }
}

for (const spec of internalSpecifiers) {
  const r = resolution.get(spec);
  if (r?.resolved) {
    const path = fileURLToPath(r.resolved);
    // `./package.json` is exported by design — it is how tooling reads metadata.
    if (spec.endsWith('/package.json')) continue;
    fail(
      `${spec}: RESOLVES to ${path}. Internal paths are not public API (ADR-004 rule 4); a ` +
        'consumer can now depend on a file that will move.',
    );
  }
}

/* ------------------------- 5. do the types resolve? ------------------------ */

/*
 * A scratch consumer with no tsconfig path mappings, resolving only through the
 * tarballs' exports maps. This is the check that a `types` condition is a
 * promise rather than a string.
 */
const consumerTs = join(consumer, 'consumer.ts');
const scripts = publicSpecifiers.filter((p) => p.kind === 'script');
const lines = [];
scripts.forEach((p, i) => lines.push(`import * as m${i} from '${p.specifier}';`));
lines.push('');
lines.push('export const TEKAD_CONSUMER_SURFACE = [');
scripts.forEach((p, i) => lines.push(`  { spec: '${p.specifier}', module: m${i} },`));
lines.push('];');
lines.push('');
writeFileSync(consumerTs, lines.join('\n'));
writeFileSync(
  join(consumer, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ['consumer.ts'],
    },
    null,
    2,
  ),
);

const tsc = createRequire(import.meta.url).resolve('typescript/lib/tsc.js');
const typecheck = spawnSync(process.execPath, [tsc, '-p', join(consumer, 'tsconfig.json')], {
  cwd: consumer,
  encoding: 'utf8',
});
if (typecheck.status !== 0) {
  fail(
    "TypeScript cannot resolve every entry point through the tarballs' exports maps:\n" +
      `${(typecheck.stdout ?? '') + (typecheck.stderr ?? '')}`.trimEnd(),
  );
}

/* -------------------------------- 6. report -------------------------------- */

const kb = (/** @type {number} */ n) => `${(n / 1024).toFixed(1)} KB`;

console.log(`Consumer boundary — ${packages.length} packed package(s) from ${DIST}\n`);
console.log('  package                 packed   unpacked  public entry points');
for (const pkg of packages) {
  const pkgExports = /** @type {BuiltManifest} */ (pkg.manifest).exports ?? {};
  const entries = Object.keys(pkgExports).filter((s) => s !== './package.json');
  console.log(
    `  ${pkg.name.padEnd(22)} ${kb(pkg.size).padStart(7)} ${kb(pkg.unpackedSize).padStart(9)}  ` +
      `${entries.length}`,
  );
}
console.log('');
const assets = publicSpecifiers.filter((p) => p.kind === 'asset').length;
console.log(
  `  ${publicSpecifiers.length - assets} script entry point(s) resolved AND type-checked, ` +
    `${assets} asset`,
);
console.log(
  `  subpath(s) resolved, ${internalSpecifiers.length} internal specifier(s) refused — against ` +
    'the tarballs',
);
console.log('  themselves, from a scratch consumer with no path mappings.');

if (notes.length) {
  console.log('');
  for (const n of notes) console.warn(`! ${n}`);
}

if (failures.length) {
  console.error(`\n✗ Consumer boundary failed:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('\nSee ADR-004, ADR-012 and docs/architecture/02-public-api-rules.md.');
  if (!KEEP) rmSync(scratch, { recursive: true, force: true });
  process.exit(1);
}

console.log('');
console.log('✓ Every shipped file is reachable, every public specifier resolves, no internal');
console.log('  path does, the declarations type-check, and no dependency is phantom.');

if (!KEEP) rmSync(scratch, { recursive: true, force: true });

/**
 * `@scope/pkg/deep/path` and `pkg/deep/path` both name `@scope/pkg` / `pkg`.
 *
 * @param {string} specifier
 */
function packageOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1] ?? ''}` : (parts[0] ?? specifier);
}
