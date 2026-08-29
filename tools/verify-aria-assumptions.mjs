#!/usr/bin/env node
/**
 * TEKAD — re-verify the two claims ADR-005's architecture rests on.
 *
 * ADR-005 decided to build the Pattern layer on `@angular/aria` and, on the
 * strength of two verified facts, decided that TEKAD owns the entire floating
 * layer (ADR-010) and must build its own live announcer:
 *
 *   1. "It peer-pins `@angular/cdk` at an EXACT version — 'Aria instead of CDK'
 *      is not an available choice."
 *   2. "It positions nothing. A grep of every published bundle for positioning
 *      APIs returns one incidental `compareDocumentPosition`."
 *
 * Both were true when the research ran. Neither is guaranteed to stay true, and
 * both could change in a PATCH release — Angular is under no obligation to keep
 * a package free of a feature. The consequences of a change run in both
 * directions, which is why this is a gate rather than a note:
 *
 *   If Aria gains a live announcer, TEKAD should DELETE its own rather than
 *   maintain a duplicate — CLAUDE.md rule 1 is KEEP before BUILD, and a
 *   silently-diverging second implementation is the worst of both.
 *
 *   If Aria gains positioning or a focus trap, ADR-010's premise that TEKAD
 *   owns the whole floating layer needs revisiting before more is built on it.
 *
 *   If the CDK pin loosens to a range, an ADR-005 consequence ("hard coupling
 *   to CDK's patch versions") stops applying.
 *
 * A failure here is NOT a bug. It means an ADR needs rereading, and the message
 * says so.
 *
 * Usage: node tools/verify-aria-assumptions.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARIA = join(ROOT, 'node_modules/@angular/aria');

if (!existsSync(ARIA)) {
  console.error('verify-aria-assumptions: @angular/aria is not installed.');
  process.exit(1);
}

/** @type {{name?: string, version?: string, peerDependencies?: Record<string,string>}} */
const pkg = JSON.parse(readFileSync(join(ARIA, 'package.json'), 'utf8'));
const version = pkg.version ?? '(unknown)';

/** @type {string[]} */
const changed = [];

console.log(`@angular/aria ${version} — re-checking the ADR-005 assumptions\n`);

/* ---- claim 1: the CDK peer is an EXACT pin -------------------------------- */
const cdkRange = pkg.peerDependencies?.['@angular/cdk'];
const isExact = typeof cdkRange === 'string' && /^\d+\.\d+\.\d+$/.test(cdkRange);
console.log(
  `  ${isExact ? '✓' : '!'} peer @angular/cdk: "${cdkRange ?? '(absent)'}"` +
    `${isExact ? ' — exact, as ADR-005 recorded' : ''}`,
);
if (!isExact) {
  changed.push(
    `@angular/cdk is peered as "${cdkRange ?? '(absent)'}", not an exact version. ` +
      'ADR-005\'s consequence "hard coupling to CDK\'s patch versions via the exact pin" ' +
      'may no longer apply.',
  );
}

/* ---- claim 2: it ships none of the floating-layer or announcement surface -- */
const bundles = existsSync(join(ARIA, 'fesm2022'))
  ? readdirSync(join(ARIA, 'fesm2022'))
      .filter((f) => f.endsWith('.mjs'))
      .map((f) => readFileSync(join(ARIA, 'fesm2022', f), 'utf8'))
  : [];

if (bundles.length === 0) {
  console.error('✗ No fesm2022 bundles found — the package layout changed. Re-read ADR-005.');
  process.exit(1);
}
const all = bundles.join('\n');

/**
 * Each entry is a capability ADR-005 recorded as ABSENT, with what its
 * appearance would mean. `allowed` is the count the research actually observed,
 * so an incidental use does not produce a permanent false alarm.
 * @type {{name: string, pattern: RegExp, allowed: number, implication: string}[]}
 */
const capabilities = [
  {
    name: 'live announcer',
    pattern: /aria-live|LiveAnnouncer/g,
    allowed: 0,
    implication:
      "TEKAD should DELETE @tekad/core/a11y/live-announcer and use Aria's instead. " +
      'KEEP before BUILD (CLAUDE.md rule 1); two implementations is the worst outcome.',
  },
  {
    name: 'focus trap',
    pattern: /FocusTrap|trapFocus/g,
    allowed: 0,
    implication:
      'ADR-010 assumes TEKAD owns focus trapping in the overlay foundation. Revisit ' +
      'before Phase 6 builds more on that premise.',
  },
  {
    name: 'dialog / popover / backdrop',
    pattern: /showModal|\.popover\b|backdrop/g,
    allowed: 0,
    implication:
      'ADR-010\'s premise that "TEKAD owns the entire floating layer" would no longer hold.',
  },
  {
    name: 'element measurement',
    pattern: /getBoundingClientRect|offsetWidth|offsetHeight|getComputedStyle/g,
    allowed: 0,
    implication:
      'Aria has started measuring elements. ADR-005 records that it positions nothing; ' +
      'check whether it has taken on positioning.',
  },
  {
    name: 'compareDocumentPosition',
    pattern: /compareDocumentPosition/g,
    allowed: 1,
    implication:
      'ADR-005 recorded exactly one incidental use. A different count means the DOM-' +
      'traversal surface has changed.',
  },
  {
    name: 'scrollIntoView',
    pattern: /scrollIntoView/g,
    allowed: 3,
    implication:
      'Aria scrolls active list items into view — scrolling, not floating-layer ' +
      "positioning. Recorded here because ADR-005's original grep did not mention it.",
  },
];

for (const cap of capabilities) {
  const count = (all.match(cap.pattern) ?? []).length;
  const ok = count === cap.allowed;
  console.log(
    `  ${ok ? '✓' : '!'} ${cap.name}: ${count} occurrence(s)` +
      (ok
        ? cap.allowed === 0
          ? ' — absent, as ADR-005 recorded'
          : ' — as recorded'
        : ` (expected ${cap.allowed})`),
  );
  if (!ok)
    changed.push(
      `${cap.name}: found ${count}, ADR-005 recorded ${cap.allowed}. ${cap.implication}`,
    );
}

/* ---- the private entry point still exists and is still off-limits --------- */
const exportsMap = /** @type {Record<string, unknown>} */ (
  JSON.parse(readFileSync(join(ARIA, 'package.json'), 'utf8')).exports ?? {}
);
const hasPrivate = Object.keys(exportsMap).includes('./private');
console.log(
  `  ${hasPrivate ? '✓' : 'i'} ./private entry point ${hasPrivate ? 'present' : 'gone'}` +
    (hasPrivate
      ? ' — the lint rule banning it is still needed'
      : ' — the lint rule may now be dead'),
);

/* -------------------------------- report ---------------------------------- */
if (changed.length > 0) {
  console.error('\n! @angular/aria no longer matches what ADR-005 recorded.\n');
  for (const c of changed) console.error(`    ${c}\n`);
  console.error(
    '  This is not a bug. It means a decision was made on facts that have moved, and\n' +
      '  the ADR needs rereading before more is built on it. Update ADR-005 (and this\n' +
      "  gate's expectations) in the same change.\n",
  );
  process.exit(1);
}

console.log(`\n✓ ADR-005's assumptions still hold for @angular/aria ${version}.`);
console.log('  TEKAD still owns the live announcer and the floating layer.');
