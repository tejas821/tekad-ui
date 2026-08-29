/**
 * TEKAD — the comparison half of the test-discovery gate, kept pure.
 *
 * ── What went wrong, and why a gate came out of it ───────────────────────
 *
 * `@nx/angular:unit-test` resolves its `include` globs against the project's
 * **source root**, so `packages/core/src` had to reach its secondary entry
 * points — which live at `packages/core/a11y/...`, outside `src` — with a
 * `../` pattern. The obvious one, `../**\/*.spec.ts`, was measured to pull in
 * *another package's* spec files: running `nx test button` tried to compile
 * `packages/core`'s specs and failed. `../a11y/**\/*.spec.ts` does not.
 *
 * Both directions of that mistake are silent in the direction that matters.
 * The leak announced itself with a build error, which is the lucky case. The
 * opposite slip — adding a secondary entry point whose specs no glob happens
 * to match — produces a green run of a suite that never executed, and nothing
 * anywhere says so.
 *
 * ── Why the discovered set is asked for, not computed ────────────────────
 *
 * The temptation is to re-implement the glob matching here and compare. That
 * would be re-making the original error: a model of the executor's behaviour
 * that is right until it isn't, checked against nothing. `nx test <p>
 * --listTests` reports what the executor actually discovered, without building
 * or running anything, so the gate compares reality to the files on disk
 * rather than one guess to another.
 */

/**
 * @typedef {object} Finding
 * @property {'unrun'|'foreign'|'orphaned'} kind
 * @property {string} project
 * @property {string[]} files
 * @property {string} why
 */

/**
 * @param {object} input
 * @param {string} input.project
 * @param {boolean} input.hasTestTarget
 * @param {string[]} input.onDisk      spec files under the package, repo-relative
 * @param {string[]} input.discovered  what --listTests reported, repo-relative
 * @returns {Finding[]}
 */
export function compare({ project, hasTestTarget, onDisk, discovered }) {
  /** @type {Finding[]} */
  const findings = [];

  if (!hasTestTarget) {
    // A package with no behaviour to test needs no test target — `@tekad/theme`
    // is constants and a type. A package with spec FILES and no target is a
    // different thing: someone wrote the tests and nothing runs them.
    if (onDisk.length > 0) {
      findings.push({
        kind: 'orphaned',
        project,
        files: onDisk,
        why: 'these spec files exist and the project has no test target, so they have never run',
      });
    }
    return findings;
  }

  const found = new Set(discovered);
  const present = new Set(onDisk);

  const unrun = onDisk.filter((f) => !found.has(f));
  if (unrun.length > 0) {
    findings.push({
      kind: 'unrun',
      project,
      files: unrun,
      why:
        'no `include` glob matches these, so they are skipped silently — the suite ' +
        'is green without them',
    });
  }

  const foreign = discovered.filter((f) => !present.has(f));
  if (foreign.length > 0) {
    findings.push({
      kind: 'foreign',
      project,
      files: foreign,
      why:
        'discovered from outside this package — an over-broad `../**` glob, which ' +
        "compiles another package's specs into this one's test build",
    });
  }

  return findings;
}

/**
 * ESC, built rather than written. A literal escape character inside a regex
 * literal trips `no-control-regex`, and the usual response — disabling the rule
 * for the line — switches off a real check to accommodate one known-safe use.
 * Composing the pattern from a character code keeps the rule armed everywhere
 * else, including in whatever gets added to this file next.
 */
const ANSI_SGR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * Parse `nx test <p> --listTests` output.
 *
 * Deliberately strict about the header. If the output format changes, this
 * returns nothing, every spec looks unrun, and the gate fails loudly — which
 * is the correct response to no longer understanding the tool's output. A
 * lenient parser would return an empty list on a format change too, but
 * indistinguishably from a project that genuinely has no tests.
 *
 * @param {string} stdout
 * @returns {{ok: true, files: string[]} | {ok: false, reason: string}}
 */
export function parseListTests(stdout) {
  const clean = stdout.replace(ANSI_SGR, '');
  const idx = clean.indexOf('Discovered test files:');
  if (idx === -1) {
    if (/No test files found|no tests/i.test(clean)) return { ok: true, files: [] };
    return {
      ok: false,
      reason: "the output has no 'Discovered test files:' header — --listTests changed shape",
    };
  }
  /** @type {string[]} */
  const files = [];
  for (const line of clean.slice(idx).split('\n').slice(1)) {
    const t = line.trim();
    if (t === '') {
      if (files.length > 0) break;
      continue;
    }
    if (!t.endsWith('.spec.ts')) break;
    files.push(t);
  }
  return { ok: true, files };
}
