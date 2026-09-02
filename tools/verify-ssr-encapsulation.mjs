#!/usr/bin/env node
/**
 * TEKAD — what view encapsulation actually costs in SSR HTML.
 *
 * ADR-007 closes with an obligation: "Emulated-encapsulation SSR cost must be
 * measured before Phase 9 (a 1,000-row table pays one `_ngcontent` attribute
 * per element)." This is that measurement, kept as a gate so the decision it
 * produced fails loudly if the facts move.
 *
 * ── What was found ───────────────────────────────────────────────────────
 *
 * The parenthesis is exactly right and leads almost everyone to the wrong
 * conclusion. Measured on a 1,000 × 8 table:
 *
 *   emulated vs none:   raw +87.7%   gzip -4.8%   brotli +10.8%
 *
 * Emulated encapsulation adds a quarter of a megabyte of raw HTML and, after
 * gzip, the document is SMALLER than the unencapsulated one. That is not a
 * measurement error: `_ngcontent-ng-c488987220=""` is the same 27 bytes every
 * time, so it lengthens the repeated unit the compressor back-references and
 * pays for itself.
 *
 * The cost is real somewhere else:
 *
 *   per-cell vs none:   raw +471.9%   gzip +17.4%   brotli +51.0%
 *
 * That shape differs by one thing — a component per cell instead of a
 * component per table. 8,001 extra host elements. **The component instance is
 * the cost, not the encapsulation attribute**, and the two get conflated
 * because they usually arrive together.
 *
 * ── What this gate asserts, and what it only reports ─────────────────────
 *
 * Asserts: the probe still measures something (the shapes differ in the
 * expected direction), and both compressed overheads stay within the bounds
 * the decision was made on. A future Angular that changes the scoping scheme,
 * or a probe that quietly stops emitting attributes, fails here.
 *
 * Reports only: raw size. It is the number everyone quotes and the one that
 * governs no decision by itself.
 *
 * NOT measured here: parse time and DOM memory. Those are real, they are the
 * remaining argument for caring about raw size, and they need a browser.
 * `--parse` adds that measurement and prints it as DIAGNOSTIC — ADR-011 is
 * explicit that size is the hard gate and runtime performance is tracked
 * without blocking, because shared CI runners have too much variance.
 *
 * Usage: node tools/verify-ssr-encapsulation.mjs [--parse]
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure, overhead, kb } from './lib/ssr-size.mjs';
import { encapsulationFindings } from './lib/encapsulation-policy.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RENDERED = join(ROOT, 'dist/ssr-probe');
const PACKAGES = join(ROOT, 'packages');
const WANT_PARSE = process.argv.includes('--parse');

/**
 * Budgets, in percent overhead over `ViewEncapsulation.None`, on the axis a
 * consumer actually pays. Set from the measured values with room for normal
 * drift, NOT as aspirations — a budget nothing is near is a budget that never
 * fires.
 */
/** @type {Map<string, {gzip: number, brotli: number}>} */
const BUDGETS = new Map([
  ['emulated', { gzip: 5, brotli: 20 }],
  ['per-cell', { gzip: 30, brotli: 70 }],
]);

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/* ── 1. the measurement ──────────────────────────────────────────────────── */

if (!existsSync(join(RENDERED, 'none.html'))) {
  console.error(
    `verify-ssr-encapsulation: ${relative(ROOT, RENDERED)} is missing.\n` +
      'Run `pnpm run ssr:render` first — it AOT-compiles the probe and renders it.',
  );
  process.exit(1);
}

const meta = JSON.parse(readFileSync(join(RENDERED, 'meta.json'), 'utf8'));
const shapes = ['none', 'emulated', 'per-cell'];
/** @type {Map<string, ReturnType<typeof measure>>} */
const measured = new Map();
for (const s of shapes)
  measured.set(s, measure(s, readFileSync(join(RENDERED, `${s}.html`), 'utf8')));

/**
 * Every shape is rendered by the same probe run, so a missing one means the
 * render half and the measuring half have gone out of step — which would make
 * every number below meaningless. Throwing is the honest response.
 *
 * @param {string} name
 */
function shape(name) {
  const x = measured.get(name);
  if (!x)
    throw new Error(`the probe did not render a "${name}" shape — re-run \`nx render ssr-probe\``);
  return x;
}

console.log(
  `TEKAD SSR encapsulation — ${meta.rows} rows x ${meta.columns} columns ` +
    `(${meta.elements.toLocaleString()} cells)\n`,
);
console.log('  shape       raw          gzip       brotli     _ngcontent  _nghost');
for (const s of shapes) {
  const x = shape(s);
  console.log(
    `  ${s.padEnd(11)} ${kb(x.raw).padEnd(12)} ${kb(x.gzip).padEnd(10)} ${kb(x.brotli).padEnd(10)} ` +
      `${String(x.ngcontent).padEnd(11)} ${x.nghost}`,
  );
}

console.log('\n  overhead over ViewEncapsulation.None:');
/** @type {Map<string, ReturnType<typeof overhead>>} */
const over = new Map();
for (const s of ['emulated', 'per-cell']) {
  const o = overhead(shape('none'), shape(s));
  over.set(s, o);
  console.log(
    `    ${s.padEnd(11)} raw ${fmt(o.raw)}   gzip ${fmt(o.gzip)}   brotli ${fmt(o.brotli)}`,
  );
}
console.log('');

/** @param {number} p */
function fmt(p) {
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`.padEnd(9);
}

/* -- non-vacuity. A probe that stopped emitting attributes would show a very
 *    flattering result and prove nothing. */
check(
  'the probe is still measuring encapsulation',
  shape('emulated').ngcontent > meta.elements && shape('none').ngcontent === 0,
  `emulated has ${shape('emulated').ngcontent} scoping attributes, none has ${shape('none').ngcontent}`,
);
check(
  'the per-cell shape really does add a component per cell',
  shape('per-cell').nghost >= meta.elements,
  `${shape('per-cell').nghost} host elements for ${meta.elements} cells`,
);

/* -- the budgets the decision rests on. */
for (const s of ['emulated', 'per-cell']) {
  const o = over.get(s);
  const b = BUDGETS.get(s);
  if (!o || !b) throw new Error(`no budget recorded for the "${s}" shape`);
  check(
    `${s}: gzip overhead within ${b.gzip}%`,
    o.gzip <= b.gzip,
    `${fmt(o.gzip).trim()} (${kb(o.gzipBytes)})`,
  );
  check(
    `${s}: brotli overhead within ${b.brotli}%`,
    o.brotli <= b.brotli,
    `${fmt(o.brotli).trim()} (${kb(o.brotliBytes)})`,
  );
}

/* ── 2. the policy this produced ─────────────────────────────────────────── */

console.log('');
const findings = encapsulationFindings(walkTs(PACKAGES), (f) => readFileSync(f, 'utf8'), ROOT);
if (findings.length === 0) {
  console.log('✓ no TEKAD component overrides view encapsulation');
} else {
  for (const f of findings) {
    failed++;
    console.log(`✗ ${f.file}:${f.line}  ${f.cls}`);
    console.log(`    ${f.why}`);
  }
}

/** @param {string} dir @returns {string[]} */
function walkTs(dir) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (p.endsWith('.ts') && !p.endsWith('.d.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

/* ── 3. optional: what raw size costs a real parser ──────────────────────── */

if (WANT_PARSE) {
  const { parseCost } = await import('./lib/ssr-parse-cost.mjs');
  console.log('\n  DIAGNOSTIC — parse cost in Chromium (not a gate; ADR-011 keeps runtime');
  console.log('  performance tracked and non-blocking, because runner variance is large)\n');
  const rows = await parseCost(shapes.map((s) => ({ name: s, file: join(RENDERED, `${s}.html`) })));
  console.log('    shape       median parse   spread     elements   attributes');
  for (const r of rows) {
    console.log(
      `    ${r.name.padEnd(11)} ${(r.medianMs.toFixed(1) + ' ms').padEnd(14)} ` +
        `${('+/-' + r.spreadMs.toFixed(0) + ' ms').padEnd(10)} ` +
        `${String(r.elements).padEnd(10)} ${r.attributes}`,
    );
  }
  // A median only separates two shapes if the gap between them is bigger than
  // the noise within either. Stated per pair, because a single summary line
  // hides that one comparison is readable here and the other is not.
  console.log('');
  for (const [a, b] of [
    ['none', 'emulated'],
    ['emulated', 'per-cell'],
  ]) {
    const x = rows.find((r) => r.name === a);
    const y = rows.find((r) => r.name === b);
    if (!x || !y) continue;
    const gap = Math.abs(y.medianMs - x.medianMs);
    const noise = Math.max(x.spreadMs, y.spreadMs);
    console.log(
      `    ${a} vs ${b}: ${gap.toFixed(0)} ms apart, noise ${noise.toFixed(0)} ms — ` +
        (gap > noise
          ? 'separable.'
          : 'NOT separable; no conclusion may be drawn from these medians.'),
    );
  }
  console.log(
    '\n    Element count is the number worth reading here, because it is exact:\n' +
      `    ${rows.map((r) => `${r.name} ${r.elements}`).join(', ')}.`,
  );
}

if (failed > 0) {
  console.error(`\n✗ ${failed} encapsulation check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ Encapsulation cost is where the decision says it is.');
