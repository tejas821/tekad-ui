#!/usr/bin/env node
/**
 * TEKAD CI gate 14 (first instalment) — theme stylesheet size budget.
 *
 * `docs/architecture/05-performance-budgets.md` says numeric budgets are set
 * when the first vertical slice exists (Phase 9), because a number invented
 * today would be invented rather than measured. This budget is the exception,
 * and only because ADR-007 already states it as a decision:
 *
 *   "Budget ~2 KB gzip for the theme sheet plus ~1 KB for the fallback."
 *
 * So this gate is not inventing a target; it is holding an existing decision to
 * account. Everything else waits for Phase 9.
 *
 * ── Why the fallback is measured separately ───────────────────────────────
 *
 * The `@supports not (color: light-dark(...))` block re-declares every colour
 * token four times over — the exact pattern the main sheet exists to avoid. It
 * is temporary: it comes out in one edit when `light-dark()` clears Angular's
 * browser floor. Rolling it into one total would hide both how much it costs
 * and how much comes back when it goes.
 *
 * Sizes are measured on the BUILT artefact and gzipped, because that is what a
 * consumer downloads. Raw byte counts flatter CSS badly — it is highly
 * repetitive and compresses far better than the source suggests.
 *
 * Usage: node tools/verify-css-budget.mjs [cssPath]
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = process.argv[2]
  ? resolve(process.argv[2])
  : join(ROOT, 'dist/packages/theme/styles/tekad.css');

/** ADR-007's stated budgets, in bytes gzipped. */
const BUDGET = {
  main: 2 * 1024,
  fallback: 1 * 1024,
};

if (!existsSync(CSS)) {
  console.error(`verify-css-budget: ${CSS} not found. Run \`pnpm exec nx build theme\` first.`);
  process.exit(1);
}

const css = readFileSync(CSS, 'utf8');

/*
 * Split at the @supports boundary. Comments are stripped first so that the
 * explanatory prose in the generated sheet — which a minifier removes and no
 * consumer ever downloads — is not charged against the budget.
 */
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
const supportsAt = stripped.indexOf('@supports not (color: light-dark(');
if (supportsAt === -1) {
  console.error(
    '✗ No @supports fallback block found.\n' +
      '  ADR-007 decision 3 requires it: light-dark() is newer than Angular v22’s\n' +
      '  browser floor, so without the fallback every token is simply undefined on a\n' +
      '  browser that has not shipped it.',
  );
  process.exit(1);
}

const mainCss = stripped.slice(0, supportsAt);
const fallbackCss = stripped.slice(supportsAt);

/** @param {string} text */
function sizes(text) {
  const buf = Buffer.from(text, 'utf8');
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: constants.Z_BEST_COMPRESSION }).length,
    brotli: brotliCompressSync(buf).length,
  };
}

const main = sizes(mainCss);
const fallback = sizes(fallbackCss);
const total = sizes(stripped);

/** @param {number} n */
const kb = (n) => (n / 1024).toFixed(2) + ' KB';

console.log('Theme stylesheet size (comments stripped, as a minifier would)\n');
console.log('                     raw        gzip       brotli     budget (gzip)');
console.log(
  `  main sheet       ${kb(main.raw).padEnd(10)} ${kb(main.gzip).padEnd(10)} ` +
    `${kb(main.brotli).padEnd(10)} ${kb(BUDGET.main)}`,
);
console.log(
  `  @supports        ${kb(fallback.raw).padEnd(10)} ${kb(fallback.gzip).padEnd(10)} ` +
    `${kb(fallback.brotli).padEnd(10)} ${kb(BUDGET.fallback)}`,
);
console.log(
  `  total            ${kb(total.raw).padEnd(10)} ${kb(total.gzip).padEnd(10)} ` +
    `${kb(total.brotli).padEnd(10)}`,
);

const failures = [];
if (main.gzip > BUDGET.main) {
  failures.push(`main sheet is ${kb(main.gzip)} gzipped, over the ${kb(BUDGET.main)} budget`);
}
if (fallback.gzip > BUDGET.fallback) {
  failures.push(`fallback is ${kb(fallback.gzip)} gzipped, over the ${kb(BUDGET.fallback)} budget`);
}

if (failures.length) {
  console.error('\n✗ Over budget:\n');
  for (const f of failures) console.error(`    ${f}`);
  console.error(
    '\n  ADR-007 states these budgets. Growth here is almost always a variant axis\n' +
      '  that has become a selector — a scheme, density or brand rule re-declaring\n' +
      '  tokens instead of letting light-dark() and a multiplier do the work. That\n' +
      '  is the mechanism behind Material’s 7.4 KB M3 theme versus ~108 KB for the\n' +
      '  M2 per-component approach. Raising the number needs a new ADR.\n',
  );
  process.exit(1);
}

console.log(
  `\n✓ Within ADR-007's budget. Headroom: ` +
    `${kb(BUDGET.main - main.gzip)} on the main sheet, ` +
    `${kb(BUDGET.fallback - fallback.gzip)} on the fallback.`,
);
console.log(
  `  The fallback is ${((fallback.gzip / total.gzip) * 100).toFixed(0)}% of the shipped bytes ` +
    `and comes out in one edit when light-dark() clears the browser floor.`,
);
