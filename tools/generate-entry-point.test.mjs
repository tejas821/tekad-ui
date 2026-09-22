#!/usr/bin/env node
/**
 * Self-test for the secondary-entry-point generator.
 *
 * A generator is only worth having if it produces the shape the BUILD expects,
 * and "the shape the build expects" is not a matter of opinion here — it is the
 * shape of the five secondary entry points that already exist and build. So the
 * central case below is a reproduction check: for every committed secondary
 * entry point, the generator's `ng-package.json` must be byte-identical to the
 * one on disk, and the two configuration edits it wants to make must already be
 * present. If someone hand-writes an eighth entry point differently, this test
 * fails and says the generator and the repository now disagree — which is the
 * whole point of having one.
 *
 * The rest are the cases where a generator does quiet damage: overwriting
 * something that exists, patching a config into invalid JSON, producing output
 * that `format:check` then rejects, or creating an entry point whose specs are
 * silently never run.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import {
  NG_PACKAGE_JSON,
  addIncludeGlob,
  addPathMapping,
  apply,
  planEntryPoint,
} from './generate-entry-point.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/* ── the reproduction check, against the entry points that already exist ─── */

const COMMITTED = [
  { pkg: 'core', subpath: 'a11y/live-announcer' },
  { pkg: 'core', subpath: 'forms/field-context' },
  { pkg: 'core', subpath: 'forms/model-control' },
  { pkg: 'core', subpath: 'primitives/identity' },
  { pkg: 'forms', subpath: 'compat' },
];

for (const { pkg, subpath } of COMMITTED) {
  const specifier = `@tekad/${pkg}/${subpath}`;
  const dir = join(ROOT, 'packages', pkg, ...subpath.split('/'));
  const ngPackage = readFileSync(join(dir, 'ng-package.json'), 'utf8');
  const index = readFileSync(join(dir, 'src/index.ts'), 'utf8');
  const tsconfig = readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8');
  const project = readFileSync(join(ROOT, 'packages', pkg, 'project.json'), 'utf8');

  const pathEdit = addPathMapping(tsconfig, specifier, `./packages/${pkg}/${subpath}/src/index.ts`);
  /*
   * The glob is checked for COVERAGE, not for equality. The committed globs are
   * one per top-level directory (`../a11y/**`), which covers this entry point
   * and every future sibling of it; the generator proposes exactly that, so the
   * two agree today. What must never happen is an entry point whose specs no
   * glob matches, and that is what this asserts.
   */
  const include = JSON.parse(project).targets?.test?.options?.include ?? ['**/*.spec.ts'];
  const covered = include.some((/** @type {string} */ glob) => {
    const prefix = glob.endsWith('**/*.spec.ts') ? glob.slice(0, -'**/*.spec.ts'.length) : null;
    return prefix !== null && `../${subpath}/`.startsWith(prefix);
  });

  check(
    `${specifier}: the generator would write exactly the committed ng-package.json`,
    ngPackage === NG_PACKAGE_JSON,
  );
  check(
    `${specifier}: tsconfig.base.json already maps it (nothing to patch)`,
    pathEdit.kind === 'present',
    pathEdit.kind === 'present' ? undefined : `got "${pathEdit.kind}"`,
  );
  check(
    `${specifier}: the package's test target already runs specs under it`,
    covered,
    covered ? undefined : `no glob in ${pkg}/project.json matches ../${subpath}/`,
  );
  {
    const proposed = `../${subpath.split('/')[0]}/**/*.spec.ts`;
    const already = addIncludeGlob(project, proposed).kind === 'present';
    check(
      `${specifier}: and the generator would propose exactly that glob`,
      already,
      already ? undefined : `it proposes ${proposed}, which is not in ${pkg}/project.json`,
    );
  }
  check(`${specifier}: its index.ts names the specifier it publishes`, index.includes(specifier));
}

/* ── a synthetic workspace, driven end to end ─────────────────────────────── */

/**
 * @param {{testTarget?: boolean, existing?: boolean}} [opts]
 */
function makeWorkspace(opts = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tekad-gen-'));
  mkdirSync(join(root, 'packages/widget/src'), { recursive: true });
  writeFileSync(
    join(root, 'packages/widget/package.json'),
    JSON.stringify({ name: '@tekad/widget', version: '0.0.0' }, null, 2),
  );
  writeFileSync(
    join(root, 'packages/widget/ng-package.json'),
    JSON.stringify({ lib: { entryFile: 'src/index.ts' } }, null, 2),
  );
  const targets =
    opts.testTarget === false
      ? { build: {} }
      : { build: {}, test: { options: { include: ['**/*.spec.ts'] } } };
  writeFileSync(join(root, 'packages/widget/project.json'), JSON.stringify({ targets }, null, 2));
  writeFileSync(
    join(root, 'tsconfig.base.json'),
    JSON.stringify(
      { compilerOptions: { paths: { '@tekad/widget': ['./packages/widget/src/index.ts'] } } },
      null,
      2,
    ),
  );
  if (opts.existing) {
    mkdirSync(join(root, 'packages/widget/extras/thing'), { recursive: true });
    writeFileSync(join(root, 'packages/widget/extras/thing/ng-package.json'), NG_PACKAGE_JSON);
  }
  return root;
}

{
  const root = makeWorkspace();
  try {
    const { specifier, steps, problems } = planEntryPoint({
      root,
      pkg: 'widget',
      subpath: 'extras/thing',
    });
    check(
      'a new entry point plans cleanly, naming its specifier',
      specifier === '@tekad/widget/extras/thing' && problems.length === 0,
      problems.join('; '),
    );
    check(
      'the plan creates two files and patches two configs — never one without the others',
      steps.filter((s) => s.action === 'create').length === 2 &&
        steps.filter((s) => s.action === 'edit').length === 2,
    );

    const written = await apply(steps, root);
    check('apply writes what it planned', written.length === 4);

    check(
      'the entry point gets ng-packagr’s one-line marker file',
      readFileSync(join(root, 'packages/widget/extras/thing/ng-package.json'), 'utf8') ===
        NG_PACKAGE_JSON,
    );
    const index = readFileSync(join(root, 'packages/widget/extras/thing/src/index.ts'), 'utf8');
    check('the index names the specifier a consumer will import', index.includes(specifier));

    const tsconfig = readFileSync(join(root, 'tsconfig.base.json'), 'utf8');
    const parsedTs = JSON.parse(tsconfig);
    check(
      'tsconfig.base.json gains the mapping AND keeps the one it had',
      parsedTs.compilerOptions.paths['@tekad/widget/extras/thing']?.[0] ===
        './packages/widget/extras/thing/src/index.ts' &&
        parsedTs.compilerOptions.paths['@tekad/widget']?.[0] === './packages/widget/src/index.ts',
    );
    check(
      'the tsconfig edit is valid JSON and prettier-clean — CI gate 2 runs on the output',
      await prettierClean(join(root, 'tsconfig.base.json'), tsconfig),
      'a splice that produces unformatted JSON fails `pnpm run format:check`',
    );

    const project = readFileSync(join(root, 'packages/widget/project.json'), 'utf8');
    const parsedProject = JSON.parse(project);
    check(
      'project.json gains the spec glob AND keeps the one it had',
      parsedProject.targets.test.options.include.includes('../extras/**/*.spec.ts') &&
        parsedProject.targets.test.options.include.includes('**/*.spec.ts'),
    );
    check(
      'the project.json edit is valid JSON and prettier-clean',
      await prettierClean(join(root, 'packages/widget/project.json'), project),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/* ── the refusals ────────────────────────────────────────────────────────── */

{
  const root = makeWorkspace({ existing: true });
  try {
    const { steps, problems } = planEntryPoint({ root, pkg: 'widget', subpath: 'extras/thing' });
    check(
      'AN EXISTING ENTRY POINT IS NEVER OVERWRITTEN',
      problems.some((p) => p.includes('already exists')) && steps.length === 0,
      problems.join('; ') || 'planned a write over an existing directory',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = makeWorkspace();
  try {
    const { problems } = planEntryPoint({ root, pkg: 'nope', subpath: 'thing' });
    check(
      'an unknown package is refused',
      problems.some((p) => p.includes('does not exist')),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = makeWorkspace({ testTarget: false });
  try {
    const { problems } = planEntryPoint({ root, pkg: 'widget', subpath: 'extras/thing' });
    check(
      'A PACKAGE WITHOUT A TEST TARGET IS REFUSED — otherwise the new specs never run',
      problems.some((p) => p.includes('no "test" target')),
      problems.join('; '),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = makeWorkspace();
  try {
    const before = readFileSync(join(root, 'tsconfig.base.json'), 'utf8');
    const { steps } = planEntryPoint({ root, pkg: 'widget', subpath: 'extras/thing' });
    // plan() reads only. Nothing below it writes until apply() is called.
    check(
      'planning writes nothing (the dry-run path is the planning path)',
      readFileSync(join(root, 'tsconfig.base.json'), 'utf8') === before &&
        !existsSync(join(root, 'packages/widget/extras/thing/ng-package.json')) &&
        steps.length > 0,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const r = spawnSync(process.execPath, [join(HERE, 'generate-entry-point.mjs')], {
    encoding: 'utf8',
  });
  check(
    'the CLI with no arguments explains itself and exits 2',
    r.status === 2 && /usage/.test((r.stdout ?? '') + (r.stderr ?? '')),
  );
}

/**
 * @param {string} file
 * @param {string} text
 */
async function prettierClean(file, text) {
  const config = await prettier.resolveConfig(file, { editorconfig: true });
  return prettier.check(text, { ...(config ?? {}), filepath: file });
}

if (failed > 0) {
  console.error(`\n${failed} generator self-test(s) failed — the generator is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ The generator reproduces every committed entry point and refuses to overwrite.');
