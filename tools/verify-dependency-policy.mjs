#!/usr/bin/env node
/**
 * TEKAD CI gate 10 (part) — dependency policy enforced at DECLARATION time.
 *
 * Why this exists, and why the eslint rule is not enough.
 *
 * `@nx/enforce-module-boundaries` has a `bannedExternalImports` option, and
 * TEKAD configures it. But it was tested rather than trusted, and the test
 * found a hole: the rule takes its external branch only when
 * `targetProject.type === 'npm'`, and an npm node exists in the Nx graph only
 * for packages that are actually installed. An `import ... from 'chart.js'` in
 * a repo where `chart.js` is not installed produces NO violation whatsoever.
 *
 * That makes the eslint rule the SECOND line of defence — it engages after
 * someone has already added the dependency. This script is the first: it fails
 * on the DECLARATION, which is the moment the decision is actually made.
 *
 * CLAUDE.md rule 7 and ADR-008: TEKAD never builds a chart engine, and no core
 * package may reach a charting library. Charts are optional, separately
 * published packages — so a charting dependency is not forbidden outright, it
 * is forbidden OUTSIDE a project tagged `type:charts`.
 *
 * Exit 0 = policy satisfied. Exit 1 = a banned declaration.
 */
import { readFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Each rule bans a set of packages everywhere EXCEPT projects carrying
 * `allowedForTag`. A rule with no `allowedForTag` bans them everywhere.
 */
const RULES = [
  {
    id: 'charts',
    reason:
      'CLAUDE.md rule 7 / ADR-008 — TEKAD never builds a chart engine, and no core package may reach one. ' +
      'Charts are optional, separately published integration packages.',
    allowedForTag: 'type:charts',
    packages: [
      'chart.js',
      'ng2-charts',
      'd3',
      'echarts',
      'ngx-echarts',
      'apexcharts',
      'ng-apexcharts',
      'highcharts',
      'highcharts-angular',
      'plotly.js',
      'plotly.js-dist',
      'recharts',
      'victory',
    ],
    prefixes: ['d3-'],
  },
  {
    id: 'test-framework-at-runtime',
    reason:
      'ADR-011 — test harnesses are public API, but nothing that ships to a consumer runtime may ' +
      'depend on a test framework. A testing entry point declares these as devDependencies of the ' +
      'workspace, never as dependencies or peerDependencies of a published package.',
    allowedForTag: 'type:testing',
    packages: ['vitest', 'jasmine', 'jasmine-core', 'karma', 'mocha', 'jest'],
    // Only runtime-facing fields matter here; devDependencies are fine.
    fields: ['dependencies', 'peerDependencies', 'optionalDependencies'],
  },
];

const DEFAULT_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/* -------- discover every workspace project and its Nx tags ---------------- */
/** @returns {string[]} */
function workspaceGlobs() {
  const f = join(ROOT, 'pnpm-workspace.yaml');
  if (!existsSync(f)) return [];
  const lines = readFileSync(f, 'utf8').split('\n');
  const out = [];
  let inPackages = false;
  for (const line of lines) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = /^\s+-\s+['"]?(.+?)['"]?\s*$/.exec(line);
      if (m && m[1]) out.push(m[1]);
      else if (line.trim() !== '' && !line.startsWith(' ')) inPackages = false;
    }
  }
  return out;
}

/** @typedef {Record<string, Record<string, string> | undefined>} Manifest */
/** @type {{rel: string, pkg: Manifest, tags: string[]}[]} */
const projects = [];

// The workspace root itself is a project for policy purposes: nothing at the
// root is tagged, so every rule applies to it.
projects.push({
  rel: 'package.json',
  pkg: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')),
  tags: [],
});

for (const g of workspaceGlobs()) {
  for (const dir of globSync(g, { cwd: ROOT })) {
    const pkgPath = join(ROOT, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const projPath = join(ROOT, dir, 'project.json');
    const tags = existsSync(projPath)
      ? (JSON.parse(readFileSync(projPath, 'utf8')).tags ?? [])
      : [];
    projects.push({
      rel: relative(ROOT, pkgPath),
      pkg: JSON.parse(readFileSync(pkgPath, 'utf8')),
      tags,
    });
  }
}

/* ------------------------------ evaluate ---------------------------------- */
const violations = [];

for (const project of projects) {
  for (const rule of RULES) {
    if (rule.allowedForTag && project.tags.includes(rule.allowedForTag)) continue;
    for (const field of rule.fields ?? DEFAULT_FIELDS) {
      /** @type {Record<string, string>} */
      const declared = project.pkg[field] ?? {};
      for (const dep of Object.keys(declared)) {
        const banned =
          rule.packages.includes(dep) || (rule.prefixes ?? []).some((p) => dep.startsWith(p));
        if (banned) {
          violations.push({
            project: project.rel,
            tags: project.tags,
            field,
            dep,
            rule,
          });
        }
      }
    }
  }
}

/* ------------------------------- report ----------------------------------- */
if (violations.length > 0) {
  console.error('\n✗ Dependency policy violated.\n');
  for (const v of violations) {
    console.error(`  ${v.project}`);
    console.error(`    declares "${v.dep}" in ${v.field}`);
    console.error(`    tags: ${v.tags.length ? v.tags.join(', ') : '(none)'}`);
    console.error(`    rule "${v.rule.id}": ${v.rule.reason}`);
    if (v.rule.allowedForTag) {
      console.error(`    permitted only in a project tagged "${v.rule.allowedForTag}".`);
    }
    console.error('');
  }
  console.error(
    'Adding one of these is an ADR decision, not a package.json edit.\n' +
      'Note: the eslint boundary rule cannot catch this on its own — it only sees\n' +
      'an import once the package is already installed. That is why this gate exists.\n',
  );
  process.exit(1);
}

console.log(
  `✓ Dependency policy satisfied across ${projects.length} project(s): ` +
    `no charting library outside type:charts, no test framework in a runtime field.`,
);
