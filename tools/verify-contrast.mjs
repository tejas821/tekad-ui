#!/usr/bin/env node
/**
 * TEKAD CI gate 6 (part) — build-time contrast assertion.
 *
 * ADR-007 decision 6, verbatim:
 *
 *   "Contrast is a build-time assertion. OKLCH `L` is not WCAG relative
 *    luminance; generate tones in OKLCH, then compute WCAG contrast for every
 *    semantic pair in both schemes and fail the build below 4.5:1 / 3:1.
 *    Consumer brand seeds run the same pipeline."
 *
 * ── Both schemes, every pair, no exceptions ───────────────────────────────
 *
 * The failure this prevents is specific and common: a palette is checked in
 * light mode, dark mode is derived by "inverting the ramp", and a pair that
 * cleared 4.5:1 on white lands at 3.9:1 on near-black. Nobody notices because
 * the check only ever ran once. So every pair is checked in BOTH schemes and
 * the worse of the two decides.
 *
 * ── The gate also checks itself for holes ─────────────────────────────────
 *
 * A `contrastWith` entry is what makes a pair checkable. Deleting one is
 * therefore the easiest possible way to make this gate pass — the pair simply
 * stops being examined, and the build goes green having verified less. So the
 * gate independently asserts that **every `on-*` token declares a partner**.
 * A gate you can silence by deleting a line is not a gate.
 *
 * `outline-variant` deliberately has no partner and is not an `on-*` token: it
 * is a decorative hairline, and holding a purely cosmetic line to 3:1 would
 * force it to look like a border. That is a design decision recorded in the
 * token source, not an omission.
 *
 * Usage: node tools/verify-contrast.mjs [reportPath]
 * Exit 0 = every declared pair clears its threshold in both schemes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatioHex, WCAG_AA } from './lib/color.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, '.nx/token-report.json');

if (!existsSync(REPORT)) {
  console.error(`verify-contrast: ${REPORT} not found. Run \`pnpm run tokens\` first.`);
  process.exit(1);
}

/**
 * @typedef {{light: string, dark: string, contrastWith?: string, level?: keyof typeof WCAG_AA}} SemanticToken
 * @type {{semantic: Record<string, SemanticToken>}}
 */
const report = JSON.parse(readFileSync(REPORT, 'utf8'));
const tokens = report.semantic;

/** @type {{name: string, partner: string, scheme: string, ratio: number, required: number}[]} */
const failures = [];
/** @type {{name: string, partner: string, worst: number, required: number}[]} */
const passes = [];
/** @type {string[]} */
const unpaired = [];

for (const [name, def] of Object.entries(tokens)) {
  /* Structural check: an on-* token without a partner is an unverified pair. */
  if (name.startsWith('on-') && !def.contrastWith) {
    unpaired.push(name);
  }

  if (!def.contrastWith) continue;

  const partner = tokens[def.contrastWith];
  if (!partner) {
    console.error(`✗ ${name} declares contrastWith "${def.contrastWith}", which is not a token.`);
    process.exit(1);
  }

  const level = def.level ?? 'normalText';
  const required = WCAG_AA[level];
  if (required === undefined) {
    console.error(`✗ ${name} declares an unknown contrast level "${level}".`);
    process.exit(1);
  }

  const ratios = {
    light: contrastRatioHex(def.light, partner.light),
    dark: contrastRatioHex(def.dark, partner.dark),
  };

  let worst = Infinity;
  for (const [scheme, ratio] of Object.entries(ratios)) {
    worst = Math.min(worst, ratio);
    if (ratio < required) {
      failures.push({ name, partner: def.contrastWith, scheme, ratio, required });
    }
  }
  passes.push({ name, partner: def.contrastWith, worst, required });
}

/* -------------------------------- report ---------------------------------- */
console.log('Contrast — WCAG 2.2 AA, every declared pair, both schemes\n');

for (const p of passes.sort((a, b) => a.worst - b.worst)) {
  const failed = failures.some((f) => f.name === p.name);
  console.log(
    `  ${failed ? '✗' : '✓'} ${p.name} on ${p.partner}`.padEnd(52) +
      `worst ${p.worst.toFixed(2)}:1  (needs ${p.required}:1)`,
  );
}

if (unpaired.length > 0) {
  console.error('\n✗ These on-* tokens declare no contrastWith partner:');
  for (const n of unpaired) console.error(`    ${n}`);
  console.error(
    '\n  An on-* token exists to sit on something. Without a partner it is never\n' +
      '  checked, and deleting a contrastWith entry would be the easiest way to make\n' +
      '  this gate pass while verifying less.',
  );
}

if (failures.length > 0) {
  console.error('\n✗ Contrast below the WCAG 2.2 AA threshold:\n');
  for (const f of failures) {
    console.error(
      `    ${f.name} on ${f.partner} — ${f.scheme} scheme: ` +
        `${f.ratio.toFixed(2)}:1, needs ${f.required}:1`,
    );
  }
  console.error(
    '\n  Adjust the tone assignment in packages/theme/tokens/semantic.json — a darker\n' +
      '  or lighter primitive tone for the failing scheme. Do NOT lower the threshold:\n' +
      '  4.5:1 and 3:1 are the WCAG 2.2 AA numbers ADR-007 conforms to, and APCA is\n' +
      '  diagnostics only.\n',
  );
}

if (failures.length > 0 || unpaired.length > 0) {
  process.exit(1);
}

console.log(`\n✓ ${passes.length} declared pair(s) clear WCAG 2.2 AA in both light and dark.`);
console.log('  Every on-* token has a partner, so nothing went unchecked.');
