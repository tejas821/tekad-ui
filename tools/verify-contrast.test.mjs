#!/usr/bin/env node
/**
 * Self-test for tools/verify-contrast.mjs.
 *
 * TEKAD's real palette clears every threshold with a wide margin, which means
 * the gate has never once failed on real data. A gate that has never failed is
 * indistinguishable from a gate that cannot fail — and this one guards an
 * accessibility guarantee, so "it printed ✓" is not evidence of anything.
 *
 * The cases below therefore feed it synthetic token reports:
 *
 *   a pair below 4.5:1 in LIGHT only, and one below in DARK only — because
 *   checking a palette once, in light mode, and deriving dark by inverting the
 *   ramp is the specific mistake this gate exists to catch;
 *
 *   a pair that clears 3:1 but not 4.5:1, asserted at both levels, so the
 *   threshold is proved to be read from the token rather than hard-coded;
 *
 *   an `on-*` token with its `contrastWith` REMOVED — the easiest possible way
 *   to make the gate pass while verifying less. If deleting a line silences an
 *   accessibility check, the check is decorative.
 *
 * ── Why this builds its own report ────────────────────────────────────────
 *
 * The last case runs the gate against TEKAD's REAL palette, which lives in a
 * generated report rather than in the repository. That case used to read
 * `.nx/token-report.json` directly, and on a clean checkout it does not exist:
 * the file is gitignored and only `pnpm run tokens` writes it. The job's step
 * order happened to produce it before the contrast gate, and this self-test ran
 * BEFORE that step — so the guard against a vacuous accessibility gate was
 * itself failing on `main`, for a reason that had nothing to do with contrast.
 *
 * So it now builds the report it needs, into its own temp directory, through
 * the real builder. A self-test that depends on the state of a shared working
 * tree is testing the working tree.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'verify-contrast.mjs');
const TMP = mkdtempSync(join(tmpdir(), 'tekad-contrast-'));

/**
 * @param {string} name
 * @param {Record<string, unknown>} semantic
 * @returns {string}
 */
function report(name, semantic) {
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify({ semantic }, null, 2));
  return p;
}

/**
 * Build TEKAD's real token report, fresh, in this test's own temp directory.
 *
 * @returns {string}
 */
function realReport() {
  const p = join(TMP, 'token-report.json');
  const r = spawnSync(
    process.execPath,
    [join(HERE, 'build-tokens.mjs'), '--check', '--report', p],
    { encoding: 'utf8' },
  );
  if (r.status !== 0 || !existsSync(p)) {
    console.error('could not build the token report this self-test runs against:');
    console.error((r.stdout ?? '') + (r.stderr ?? ''));
    process.exit(1);
  }
  return p;
}

/** @param {string} path */
function run(path) {
  const r = spawnSync(process.execPath, [SCRIPT, path], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/* #767676 on white is 4.54:1 — just over. #888888 on white is 3.54:1 — under
 * 4.5 but over 3, which is what makes it useful for the threshold test. */
const OK_LIGHT = { light: '#767676', dark: '#a0a0a0' };
const WEAK = { light: '#888888', dark: '#888888' };
const WHITE_BLACK = { light: '#ffffff', dark: '#000000' };

const cases = [
  {
    name: 'a palette that clears AA in both schemes → PASS',
    path: report('good.json', {
      surface: WHITE_BLACK,
      'on-surface': { ...OK_LIGHT, contrastWith: 'surface', level: 'normalText' },
    }),
    expectExit: 0,
  },
  {
    name: 'below 4.5:1 in the LIGHT scheme only → FAIL',
    path: report('bad-light.json', {
      surface: WHITE_BLACK,
      'on-surface': {
        light: '#888888', // 3.54:1 on white
        dark: '#ffffff', // 21:1 on black
        contrastWith: 'surface',
        level: 'normalText',
      },
    }),
    expectExit: 1,
    expectMatch: /light scheme/,
  },
  {
    name: 'below 4.5:1 in the DARK scheme only → FAIL (the mistake this gate exists for)',
    path: report('bad-dark.json', {
      surface: WHITE_BLACK,
      'on-surface': {
        light: '#000000', // 21:1 on white
        dark: '#3a3a3a', // ~1.9:1 on black
        contrastWith: 'surface',
        level: 'normalText',
      },
    }),
    expectExit: 1,
    expectMatch: /dark scheme/,
  },
  {
    name: '3.54:1 asserted as normalText (4.5 required) → FAIL',
    path: report('level-normal.json', {
      surface: { light: '#ffffff', dark: '#ffffff' },
      'on-surface': { ...WEAK, contrastWith: 'surface', level: 'normalText' },
    }),
    expectExit: 1,
    expectMatch: /needs 4\.5:1/,
  },
  {
    name: 'the SAME colours asserted as nonText (3 required) → PASS',
    path: report('level-nontext.json', {
      surface: { light: '#ffffff', dark: '#ffffff' },
      outline: { ...WEAK, contrastWith: 'surface', level: 'nonText' },
    }),
    expectExit: 0,
  },
  {
    name: 'an on-* token with its contrastWith deleted → FAIL, not silently skipped',
    path: report('unpaired.json', {
      surface: WHITE_BLACK,
      'on-surface': { light: '#888888', dark: '#888888' },
    }),
    expectExit: 1,
    expectMatch: /declare no contrastWith partner/,
  },
  {
    name: 'a contrastWith pointing at a token that does not exist → FAIL',
    path: report('dangling.json', {
      'on-surface': {
        light: '#000000',
        dark: '#ffffff',
        contrastWith: 'nope',
        level: 'normalText',
      },
    }),
    expectExit: 1,
    expectMatch: /not a token/,
  },
  {
    name: "TEKAD's real palette → PASS",
    path: realReport(),
    expectExit: 0,
  },
];

let failed = 0;
for (const c of cases) {
  const { status, out } = run(c.path);
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
}

if (failed > 0) {
  console.error(
    `\n${failed} contrast-gate self-test(s) failed — the accessibility assertion is not trustworthy.`,
  );
  process.exit(1);
}
console.log('\n✓ Contrast gate fails on a real shortfall in either scheme, reads the threshold');
console.log('  from the token, and cannot be silenced by deleting a contrastWith entry.');
