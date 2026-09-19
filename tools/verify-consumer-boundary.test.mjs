#!/usr/bin/env node
/**
 * Self-test for tools/verify-consumer-boundary.mjs.
 *
 * The gate's value is that it fires on the failures nobody can see from inside
 * the repository: a file that ships and is reachable by nobody, an export that
 * points at something the tarball does not contain, an import that resolves
 * here only because this workspace happens to have the package installed.
 *
 * Each case therefore builds a synthetic DIST — real directories, real
 * package.json files, packed by the real `npm pack` — and runs the real gate
 * against it. Nothing is mocked, so a case that passes proves the gate's whole
 * path works: packing, archive reading, resolution from a scratch consumer, and
 * the TypeScript pass over the tarballs' own exports maps.
 *
 * One case is the positive control: a package that breaks none of the rules
 * must PASS. A gate that fails on everything is as useless as one that fails on
 * nothing, and both look identical from a red build.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-consumer-boundary.mjs');

/** A minimal package that satisfies every rule; each case mutates one thing. */
const GOOD = {
  manifest: {
    name: '@tekad/fixture',
    version: '0.0.0',
    private: true,
    sideEffects: false,
    type: 'module',
    typings: 'types/index.d.ts',
    module: 'fesm2022/index.mjs',
    exports: {
      './package.json': { default: './package.json' },
      '.': { types: './types/index.d.ts', default: './fesm2022/index.mjs' },
    },
  },
  files: {
    'fesm2022/index.mjs': 'export const FIXTURE = "fixture";\n',
    'fesm2022/index.mjs.map': '{}\n',
    'types/index.d.ts': 'export declare const FIXTURE: string;\n',
    'types/index.d.ts.map': '{}\n',
  },
};

/** A second package that depends on the first, so peer resolution is exercised. */
const DEPENDENT = {
  manifest: {
    name: '@tekad/fixture-dependent',
    version: '0.0.0',
    private: true,
    sideEffects: false,
    type: 'module',
    typings: 'types/index.d.ts',
    module: 'fesm2022/index.mjs',
    peerDependencies: { '@tekad/fixture': '0.0.0' },
    exports: {
      './package.json': { default: './package.json' },
      '.': { types: './types/index.d.ts', default: './fesm2022/index.mjs' },
    },
  },
  files: {
    'fesm2022/index.mjs':
      'import { FIXTURE } from "@tekad/fixture";\nexport const NAME = FIXTURE;\n',
    'types/index.d.ts': 'export declare const NAME: string;\n',
  },
};

/**
 * One fixture package: a manifest and the files that ship next to it.
 *
 * @typedef {object} Fixture
 * @property {Record<string, unknown>} manifest
 * @property {Record<string, string>} files
 */

/**
 * @param {Fixture[]} packages
 * @param {{extraFiles?: Record<string, string>}} [opts]
 * @returns {string} a dist directory
 */
function makeDist(packages, opts = {}) {
  const dist = mkdtempSync(join(tmpdir(), 'tekad-boundary-'));
  packages.forEach((pkg, i) => {
    const dir = join(dist, `fixture-${i}`);
    for (const [path, content] of Object.entries({ ...pkg.files, ...(opts.extraFiles ?? {}) })) {
      const file = join(dir, ...path.split('/'));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg.manifest, null, 2));
  });
  return dist;
}

/**
 * @param {string} dist
 */
function run(dist) {
  const r = spawnSync(process.execPath, [SCRIPT, dist], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/**
 * @typedef {object} Case
 * @property {string} name
 * @property {Fixture[]} packages
 * @property {number} expectExit
 * @property {RegExp} [expectMatch]
 * @property {{extraFiles?: Record<string,string>}} [opts]
 */

/** @type {Case[]} */
const cases = [
  {
    name: 'a correct package, packing and resolving cleanly → PASS',
    packages: [GOOD, DEPENDENT],
    expectExit: 0,
  },
  {
    // The defect this gate was written for. `@tekad/theme` shipped
    // styles/tekad.css — the file its README calls the package's reason to
    // exist — with an exports map that did not name it, so every resolver that
    // honours `exports` refused it. Nothing in the repository could see it.
    name: 'a shipped file no exports subpath names → FAIL',
    packages: [GOOD],
    opts: { extraFiles: { 'styles/theme.css': 'body { color: black }\n' } },
    expectExit: 1,
    expectMatch: /ships "styles\/theme\.css", which no exports subpath names/,
  },
  {
    name: 'an exports target that is not in the tarball → FAIL',
    packages: [
      {
        manifest: {
          ...GOOD.manifest,
          exports: {
            ...GOOD.manifest.exports,
            './ghost': { types: './types/index.d.ts', default: './fesm2022/ghost.mjs' },
          },
        },
        files: GOOD.files,
      },
    ],
    expectExit: 1,
    expectMatch: /exports "\.\/ghost" -> "\.\/fesm2022\/ghost\.mjs", which is not in the tarball/,
  },
  {
    name: 'a types condition pointing at something that is not a .d.ts → FAIL',
    packages: [
      {
        manifest: {
          ...GOOD.manifest,
          exports: {
            ...GOOD.manifest.exports,
            '.': { types: './fesm2022/index.mjs', default: './fesm2022/index.mjs' },
          },
        },
        files: GOOD.files,
      },
    ],
    expectExit: 1,
    expectMatch: /types condition pointing at/,
  },
  {
    // Proves the TypeScript pass is live rather than a line that always
    // succeeds. With no declaration file, a bundler-resolution import under
    // `strict` is an implicit any, which tsc reports.
    name: 'no declarations at all → FAIL (the type-check step is live)',
    packages: [
      {
        manifest: {
          name: '@tekad/fixture',
          version: '0.0.0',
          private: true,
          sideEffects: false,
          type: 'module',
          exports: {
            './package.json': { default: './package.json' },
            '.': { default: './fesm2022/index.mjs' },
          },
        },
        files: { 'fesm2022/index.mjs': 'export const FIXTURE = "fixture";\n' },
      },
    ],
    expectExit: 1,
    expectMatch: /TypeScript cannot resolve every entry point/,
  },
  {
    name: 'a lifecycle script in the published manifest → FAIL',
    packages: [
      {
        manifest: { ...GOOD.manifest, scripts: { postinstall: 'node evil.js' } },
        files: GOOD.files,
      },
    ],
    expectExit: 1,
    expectMatch: /declares lifecycle scripts \(postinstall\)/,
  },
  {
    name: 'an import that is not declared as a peer or a dependency → FAIL',
    packages: [
      {
        manifest: GOOD.manifest,
        files: {
          ...GOOD.files,
          'fesm2022/index.mjs':
            'import { leftPad } from "left-pad";\nexport const FIXTURE = leftPad;\n',
        },
      },
    ],
    expectExit: 1,
    expectMatch: /imports "left-pad", which is not declared/,
  },
  {
    name: 'a runtime dependency nothing imports → FAIL',
    packages: [
      {
        manifest: { ...GOOD.manifest, dependencies: { 'unused-thing': '^1.0.0' } },
        files: GOOD.files,
      },
    ],
    expectExit: 1,
    expectMatch: /declares "unused-thing" as a runtime dependency and no shipped file imports it/,
  },
  {
    // The one recorded exception, and the reason it is recorded: ng-packagr
    // injects tslib into every package it writes, whatever the source says.
    name: 'tslib declared and unused → PASS (ng-packagr injects it; the reason is in the gate)',
    packages: [
      {
        manifest: { ...GOOD.manifest, dependencies: { tslib: '^2.8.1' } },
        files: GOOD.files,
      },
    ],
    expectExit: 0,
  },
  {
    name: 'a WILDCARD subpath → FAIL',
    packages: [
      {
        manifest: {
          ...GOOD.manifest,
          exports: { ...GOOD.manifest.exports, './*': { default: './*' } },
        },
        files: GOOD.files,
      },
    ],
    expectExit: 1,
    expectMatch: /exports the wildcard subpath/,
  },
  {
    // The negative direction. If an internal path ever becomes resolvable, a
    // consumer can depend on a file that is free to move, so the gate has to
    // fail on a path that RESOLVES, not merely note that it exists.
    name: 'an internal src/ path that actually resolves → FAIL',
    packages: [
      {
        manifest: {
          ...GOOD.manifest,
          exports: {
            ...GOOD.manifest.exports,
            './src/index.ts': { types: './src/index.ts', default: './src/index.ts' },
          },
        },
        files: {
          ...GOOD.files,
          'src/index.ts': 'export const INTERNAL = true;\n',
          'src/index.ts.map': '{}\n',
        },
      },
    ],
    expectExit: 1,
    expectMatch: /Internal paths are not public API/,
  },
  {
    name: 'sideEffects missing → FAIL',
    packages: [{ manifest: { ...GOOD.manifest, sideEffects: undefined }, files: GOOD.files }],
    expectExit: 1,
    expectMatch: /sideEffects is undefined, not false/,
  },
  {
    name: 'private: false → PASS, with the publish gate reported as a note',
    packages: [{ manifest: { ...GOOD.manifest, private: false }, files: GOOD.files }],
    expectExit: 0,
    expectMatch: /"private" is not true/,
  },
];

let failed = 0;
for (const c of cases) {
  const dist = makeDist(c.packages, c.opts ?? {});
  try {
    const { status, out } = run(dist);
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
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} consumer-boundary self-test(s) failed — the artefact check is not trustworthy.`,
  );
  process.exit(1);
}
console.log('\n✓ Consumer-boundary gate self-test passed.');
