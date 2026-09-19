#!/usr/bin/env node
/**
 * TEKAD — creating a secondary entry point, in the shape this repository
 * actually builds.
 *
 * ADR-004's granularity turned out to be the right call (Spike A: the
 * TypeScript server does offer a deep import from a secondary entry point), and
 * it has a cost nobody questioned until the seventh of them had been written by
 * hand: every entry point needs the same four things, and three of them are in
 * files that already exist.
 *
 *   1. `packages/<pkg>/<sub>/ng-package.json` — which is one line, and has been
 *      the same line seven times.
 *   2. `packages/<pkg>/<sub>/src/index.ts` — the public surface.
 *   3. a `paths` entry in `tsconfig.base.json`, without which the workspace
 *      cannot resolve what it just created.
 *   4. an `include` glob in the package's `project.json`, without which any
 *      spec placed in the new entry point is silently never run — the failure
 *      `tools/verify-test-discovery.mjs` exists to catch, arriving through the
 *      front door.
 *
 * Nx's stock secondary-entry-point generator emits a flat, one-level entry
 * point containing an NgModule, and NgModules are not public API here
 * (CLAUDE.md rule 4). So this is TEKAD's own, and it is written the way every
 * other tool in this directory is: it plans, it refuses to overwrite, it
 * verifies what it wrote by parsing it back, and it has a self-test that
 * asserts the plan reproduces the seven entry points that were hand-written.
 *
 * ── Why the JSON is edited as text ────────────────────────────────────────
 *
 * `tsconfig.base.json` keeps each path mapping on one line, and
 * `project.json` keeps its `include` array on one line. Re-serialising those
 * files would rewrite every compact object in them — a diff nobody can review,
 * for a change of two lines. So the edit is a splice at a located position, and
 * the result is then PARSED BACK and compared field by field against what the
 * edit intended. A splice that lands in the wrong place fails the generator
 * instead of being committed.
 *
 * Usage: node tools/generate-entry-point.mjs <package> <subpath> [--dry-run]
 *   e.g. node tools/generate-entry-point.mjs core forms/model-control
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Byte-identical to all seven hand-written ones — asserted by the self-test. */
export const NG_PACKAGE_JSON = '{ "lib": { "entryFile": "src/index.ts" } }\n';

/**
 * @typedef {object} Step
 * @property {'create'|'edit'|'skip'} action
 * @property {string} file      workspace-relative
 * @property {string} [content] bytes to write, for a create or an edit
 * @property {string} why
 */

/**
 * Plan the creation of one secondary entry point. Pure: it reads, it computes,
 * it writes nothing. `apply()` is the half that touches disk.
 *
 * @param {object} input
 * @param {string} input.root
 * @param {string} input.pkg     directory name under packages/
 * @param {string} input.subpath e.g. `forms/model-control`
 * @returns {{specifier: string, steps: Step[], problems: string[]}}
 */
export function planEntryPoint({ root, pkg, subpath }) {
  /** @type {string[]} */
  const problems = [];
  /** @type {Step[]} */
  const steps = [];

  const pkgDir = join(root, 'packages', pkg);
  const entryDir = join(pkgDir, ...subpath.split('/'));
  const rel = (/** @type {string} */ p) => p.slice(root.length + 1);

  if (!existsSync(join(pkgDir, 'package.json'))) {
    return { specifier: '', steps, problems: [`packages/${pkg} does not exist.`] };
  }
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  if (!pkgJson.name?.startsWith('@tekad/')) {
    problems.push(`packages/${pkg} is not a @tekad package (name: ${pkgJson.name}).`);
  }
  if (!existsSync(join(pkgDir, 'ng-package.json'))) {
    problems.push(`packages/${pkg}/ng-package.json is missing; it is not a package root.`);
  }
  if (subpath.split('/').length > 2) {
    problems.push('A subpath is one or two levels, e.g. `identity` or `forms/model-control`.');
  }
  if (existsSync(join(entryDir, 'ng-package.json'))) {
    problems.push(
      `${rel(entryDir)} already exists. This generator never overwrites: edit it, ` +
        'or pick another name.',
    );
  }
  if (problems.length) return { specifier: '', steps, problems };

  const specifier = `${pkgJson.name}/${subpath}`;

  /* 1. the entry point's own ng-package.json */
  steps.push({
    action: 'create',
    file: `${rel(entryDir)}/ng-package.json`,
    content: NG_PACKAGE_JSON,
    why: 'ng-packagr finds a secondary entry point by this file, not by convention.',
  });

  /* 2. the public surface */
  steps.push({
    action: 'create',
    file: `${rel(entryDir)}/src/index.ts`,
    content: indexSource(specifier, pkg, subpath),
    why: 'the entry point exists to declare a public surface; nothing else is importable.',
  });

  /* 3. tsconfig.base.json — the workspace has to be able to resolve it */
  const tsconfigPath = join(root, 'tsconfig.base.json');
  const tsconfig = readFileSync(tsconfigPath, 'utf8');
  const withPath = addPathMapping(tsconfig, specifier, `./${rel(entryDir)}/src/index.ts`);
  if (withPath.kind === 'present') {
    steps.push({
      action: 'skip',
      file: 'tsconfig.base.json',
      why: `already maps ${specifier}.`,
    });
  } else if (withPath.kind === 'error') {
    problems.push(withPath.message);
  } else {
    steps.push({
      action: 'edit',
      file: 'tsconfig.base.json',
      content: withPath.text,
      why: `maps ${specifier} to the new entry file.`,
    });
  }

  /* 4. the package's test target — the silent-skip trap */
  const projectPath = join(pkgDir, 'project.json');
  const project = readFileSync(projectPath, 'utf8');
  const hasTestTarget = Boolean(JSON.parse(project).targets?.test);
  if (!hasTestTarget) {
    problems.push(
      `packages/${pkg} has no "test" target, so a spec in ${rel(entryDir)} would never run ` +
        '(tools/verify-test-discovery.mjs fails on exactly that). Add the target before ' +
        'putting tests here.',
    );
  } else {
    /*
     * One glob per TOP-LEVEL directory under the package, not per entry point.
     * Both work; this one means a second entry point under the same category
     * needs no project.json edit, which is one fewer place to forget. It is
     * still package-scoped — `../forms/**` only ever matches
     * `packages/<pkg>/forms/…` — and that matters, because the broadest version
     * of this (`../**`) was measured pulling another package's specs into a
     * build.
     */
    const glob = `../${subpath.split('/')[0]}/**/*.spec.ts`;
    const withGlob = addIncludeGlob(project, glob);
    if (withGlob.kind === 'present') {
      steps.push({
        action: 'skip',
        file: `packages/${pkg}/project.json`,
        why: `already includes ${glob}.`,
      });
    } else if (withGlob.kind === 'error') {
      problems.push(withGlob.message);
    } else {
      steps.push({
        action: 'edit',
        file: `packages/${pkg}/project.json`,
        content: withGlob.text,
        why: `runs specs under ${subpath.split('/')[0]}/ — without it they are skipped in silence.`,
      });
    }
  }

  return { specifier, steps, problems };
}

/**
 * Insert one mapping into `compilerOptions.paths`, keeping the file's own
 * formatting. The result is parsed back before it is returned.
 *
 * @param {string} text
 * @param {string} key
 * @param {string} target
 * @returns {{kind: 'edit', text: string} | {kind: 'present'} | {kind: 'error', message: string}}
 */
export function addPathMapping(text, key, target) {
  /** @type {{compilerOptions?: {paths?: Record<string, string[]>}}} */
  const parsed = JSON.parse(text);
  const paths = parsed.compilerOptions?.paths;
  if (!paths) return { kind: 'error', message: 'tsconfig.base.json has no compilerOptions.paths.' };
  if (paths[key]) return { kind: 'present' };

  const start = text.indexOf('"paths"');
  if (start === -1)
    return { kind: 'error', message: 'could not locate "paths" in tsconfig.base.json.' };
  const open = text.indexOf('{', start);
  const close = matchingBrace(text, open);
  if (open === -1 || close === -1) {
    return { kind: 'error', message: 'could not find the end of the "paths" object.' };
  }

  // Same indentation and one-line shape as the mappings already there, because
  // that is what the file looks like. Inserted as the LAST property, which
  // means the property above it needs the comma the JSON grammar requires —
  // and which is exactly the mistake a text splice makes silently.
  const before = text.slice(0, close);
  const body = before.replace(/\s+$/, '');
  const gap = before.slice(body.length);
  const closeIndent = gap.includes('\n') ? gap.slice(gap.lastIndexOf('\n') + 1) : '    ';
  // The indentation of the mappings already in the file, taken from the LAST
  // of them. `[ \t]` rather than `\s`, which would swallow the newline.
  const indents = [...body.matchAll(/\n([ \t]+)"[^"]*":[ \t]*\[/g)];
  const indent = indents[indents.length - 1]?.[1] ?? `${closeIndent}  `;
  const needsComma = !body.endsWith(',') && !body.endsWith('{');
  const entry = `"${key}": ["${target}"]`;
  const updated = `${body}${needsComma ? ',' : ''}\n${indent}${entry}\n${closeIndent}${text.slice(close)}`;

  if (!updated.includes(entry)) {
    return { kind: 'error', message: 'the paths splice did not take effect.' };
  }
  /** Parse it back: an edit that produces invalid JSON is not an edit. */
  const check = JSON.parse(updated);
  if (check.compilerOptions?.paths?.[key]?.[0] !== target) {
    return { kind: 'error', message: 'the paths splice did not produce the mapping it intended.' };
  }
  const beforeKeys = Object.keys(paths);
  const afterKeys = Object.keys(check.compilerOptions.paths);
  const samePrefix =
    afterKeys.length === beforeKeys.length + 1 &&
    beforeKeys.every((k, i) => afterKeys[i] === k) &&
    afterKeys[afterKeys.length - 1] === key;
  if (!samePrefix) {
    return {
      kind: 'error',
      message: 'the paths splice changed mappings it was not asked to touch.',
    };
  }
  return { kind: 'edit', text: updated };
}

/**
 * Insert one glob into a project's test `include`, keeping the file's own
 * formatting (the array is one line today; prettier reflows it if it grows).
 *
 * @param {string} text
 * @param {string} glob
 * @returns {{kind: 'edit', text: string} | {kind: 'present'} | {kind: 'error', message: string}}
 */
export function addIncludeGlob(text, glob) {
  /** @type {{targets?: {test?: {options?: {include?: string[]}}}}} */
  const parsed = JSON.parse(text);
  const include = parsed.targets?.test?.options?.include;
  if (!include) return { kind: 'error', message: 'the test target has no include array.' };
  if (include.includes(glob)) return { kind: 'present' };

  const match = /("include":\s*)\[[^\]]*\]/.exec(text);
  if (!match) return { kind: 'error', message: 'could not locate the test include array.' };
  const list = [...include, glob].map((g) => JSON.stringify(g)).join(', ');
  const updated = text.replace(match[0], `${match[1]}[${list}]`);

  const check = JSON.parse(updated);
  const after = check.targets?.test?.options?.include ?? [];
  if (!after.includes(glob)) {
    return { kind: 'error', message: 'the include splice did not take effect.' };
  }
  if (after.length !== include.length + 1) {
    return {
      kind: 'error',
      message: 'the include splice changed the array length by more than one.',
    };
  }
  return { kind: 'edit', text: updated };
}

/**
 * @param {string} text
 * @param {number} open index of the `{`
 */
function matchingBrace(text, open) {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * The starter file. Deliberately honest about being unwritten: an entry point
 * with a plausible-looking stub is the kind of thing that survives to a
 * release.
 *
 * @param {string} specifier
 * @param {string} pkg
 * @param {string} subpath
 */
function indexSource(specifier, pkg, subpath) {
  return `/**
 * \`${specifier}\` — a secondary entry point of \`@tekad/${pkg}\`.
 *
 * ADR-004: entry points exist so that installing one capability does not pull
 * the ecosystem, and so that the public surface of each capability is a file
 * somebody chose. Nothing outside this directory is importable by a consumer.
 *
 * Created by \`node tools/generate-entry-point.mjs ${pkg} ${subpath}\`. The
 * surrounding configuration is generated; the surface below is not.
 */
export {};
`;
}

/**
 * Write a plan. Creates are exclusive — a file that exists is never touched.
 *
 * @param {Step[]} steps
 * @param {string} root
 */
export async function apply(steps, root) {
  /** @type {string[]} */
  const written = [];
  for (const step of steps) {
    if (step.action === 'skip') continue;
    const file = join(root, step.file);
    if (step.action === 'create') {
      if (existsSync(file)) throw new Error(`${step.file} appeared between planning and writing.`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, step.content ?? '');
      written.push(step.file);
      continue;
    }
    if (!existsSync(file)) throw new Error(`${step.file} vanished between planning and writing.`);
    /*
     * The JSON files are formatted by prettier rather than by the splice, so
     * that whatever shape the splice produced is the shape `format:check`
     * expects. Prettier only reflows what changed — JSON objects are not
     * collapsed across the lines an author kept.
     */
    const formatted = await prettier.format(step.content ?? '', {
      ...(await prettier.resolveConfig(file, { editorconfig: true })),
      filepath: file,
    });
    writeFileSync(file, formatted);
    written.push(step.file);
  }
  return written;
}

/* --------------------------------- the CLI -------------------------------- */

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const DRY = process.argv.includes('--dry-run');
  const [pkg, subpath] = args;

  if (!pkg || !subpath) {
    console.error('usage: node tools/generate-entry-point.mjs <package> <subpath> [--dry-run]');
    console.error('  e.g. node tools/generate-entry-point.mjs core forms/model-control');
    process.exit(2);
  }

  const { specifier, steps, problems } = planEntryPoint({ root: ROOT, pkg, subpath });

  for (const step of steps) {
    const marker = { create: '+', edit: '~', skip: '=' }[step.action];
    console.log(`${marker} ${step.file}  — ${step.why}`);
  }

  if (problems.length) {
    console.error('');
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  if (steps.length === 0) {
    console.error('✗ nothing to do.');
    process.exit(1);
  }

  if (DRY) {
    console.log(`\n${specifier}: planned, nothing written (--dry-run).`);
  } else {
    const written = await apply(steps, ROOT);
    console.log(`\n${specifier}: ${written.length} file(s) written.`);
    console.log(
      'Next: export the public surface from the new index.ts, then run `pnpm run verify`.',
    );
  }
}
