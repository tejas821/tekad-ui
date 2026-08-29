/**
 * TEKAD — the judgement half of the mutation gate, kept pure so it can be
 * tested without running anything.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Every gate in `tools/` ships with a self-test proving it fails when it
 * should. Unit tests had no equivalent, and they need one more than the gates
 * do: a gate that stops working usually starts passing loudly on a fixture,
 * whereas a unit test that stops asserting anything just goes green.
 *
 * The live-announcer suite made the point concretely. Nine of its tests still
 * pass when the service's central behaviour — clearing the region before
 * setting it, so the change is observable — is deleted. Only two catch it.
 * "The suite is green" was therefore never the interesting fact; "these
 * specific tests fail when this specific line is wrong" is.
 *
 * ── What is deliberately NOT here ────────────────────────────────────────
 *
 * This is not a mutation-testing framework. There is no operator library, no
 * automatic mutant generation, no coverage-guided search. Those produce
 * hundreds of mutants, most of them equivalent or uninteresting, and a score
 * nobody acts on. CLAUDE.md rule 9 wants a concrete current use and a measured
 * benefit, and a hand-written manifest of mutants that correspond to real
 * mistakes has both: each entry is a defect someone could plausibly introduce,
 * named, with the test that must catch it.
 */

/**
 * @typedef {object} Mutant
 * @property {string} id
 * @property {string} why          what real mistake this stands in for
 * @property {string} project      the Nx project whose tests must catch it
 * @property {string} file         path, relative to the workspace root
 * @property {string[]} find       exact source lines to replace (joined by \n)
 * @property {string[]} replace    what to put there
 * @property {string[]} expectFailing  test names that MUST fail
 */

/**
 * @typedef {object} Report
 * @property {number} numTotalTests
 * @property {number} numFailedTests
 * @property {{assertionResults: {fullName: string, status: string}[]}[]} testResults
 */

/**
 * Locate the anchor, insisting it is unambiguous.
 *
 * An anchor matching twice is a configuration error, not a near miss: the
 * mutation would land somewhere the author did not picture, and the gate would
 * go on reporting success about the wrong edit.
 *
 * @param {string} source
 * @param {string} find
 * @param {string} replace
 * @returns {{ok: true, mutated: string} | {ok: false, reason: string}}
 */
export function applyAnchor(source, find, replace) {
  if (find.length === 0) return { ok: false, reason: 'the anchor is empty' };
  const first = source.indexOf(find);
  if (first === -1) {
    return {
      ok: false,
      reason:
        'the anchor is not in the file — the source moved and this mutant no ' +
        'longer describes it. Fix the manifest; do not delete the mutant.',
    };
  }
  if (source.indexOf(find, first + 1) !== -1) {
    return { ok: false, reason: 'the anchor matches more than once, so the mutation is ambiguous' };
  }
  return {
    ok: true,
    mutated: source.slice(0, first) + replace + source.slice(first + find.length),
  };
}

/**
 * Flatten a Vitest JSON report into name → status.
 *
 * @param {Report} report
 * @returns {Map<string, string>}
 */
export function statuses(report) {
  /** @type {Map<string, string>} */
  const m = new Map();
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) m.set(a.fullName, a.status);
  }
  return m;
}

/**
 * Decide whether a mutant was properly caught.
 *
 * Three ways a mutation run can look like a success and not be one, all of
 * which this rejects:
 *
 *   1. **The mutant survived.** Every test passed. The behaviour is not
 *      covered by anything, and the suite's greenness means nothing here.
 *
 *   2. **The mutant broke the build.** Zero tests ran, so "the run failed" is
 *      true and uninformative — a syntax error would satisfy it. A mutant must
 *      be a *plausible defect*, which means it has to compile.
 *
 *   3. **The named test is gone.** Someone renamed or deleted the test that
 *      was doing the catching, some *other* test failed instead, and the run
 *      is red for a reason nobody chose. This is the failure this whole file
 *      exists to catch, so it is reported distinctly rather than folded into
 *      "something failed".
 *
 * @param {Mutant} mutant
 * @param {Report} report
 * @returns {{ok: boolean, reasons: string[], caughtBy: string[], alsoFailed: string[]}}
 */
export function judge(mutant, report) {
  /** @type {string[]} */
  const reasons = [];
  const byName = statuses(report);
  const total = report.numTotalTests ?? byName.size;

  if (total === 0) {
    reasons.push(
      'the mutant ran no tests at all — it broke the build rather than the ' +
        'behaviour. A mutant must compile, or it proves nothing about the suite.',
    );
    return { ok: false, reasons, caughtBy: [], alsoFailed: [] };
  }

  /** @type {string[]} */
  const caughtBy = [];
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const survived = [];

  for (const name of mutant.expectFailing) {
    const matches = [...byName.keys()].filter((k) => k === name || k.endsWith(` ${name}`));
    if (matches.length === 0) {
      missing.push(name);
      continue;
    }
    const failed = matches.filter((k) => byName.get(k) === 'failed');
    if (failed.length === 0) survived.push(name);
    else caughtBy.push(...failed);
  }

  if (missing.length > 0) {
    reasons.push(
      `no test is named ${missing.map((m) => JSON.stringify(m)).join(', ')} — the ` +
        'manifest names a test that no longer exists, so nothing is known to be ' +
        'guarding this behaviour.',
    );
  }
  if (survived.length > 0) {
    reasons.push(
      `${survived.map((s) => JSON.stringify(s)).join(', ')} PASSED with the mutant ` +
        'applied. The behaviour it claims to cover is not actually covered.',
    );
  }

  const expected = new Set(caughtBy);
  const alsoFailed = [...byName.entries()]
    .filter(([k, v]) => v === 'failed' && !expected.has(k))
    .map(([k]) => k);

  return { ok: reasons.length === 0, reasons, caughtBy, alsoFailed };
}
