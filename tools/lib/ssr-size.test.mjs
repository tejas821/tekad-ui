#!/usr/bin/env node
/**
 * Self-test for the SSR encapsulation gate's two pure halves.
 *
 * The measurement half is arithmetic over a compressor, and the thing to guard
 * is the *direction* of the number it reports: "47% smaller" and "88% more
 * expensive" describe the same pair of files, and a gate that quietly reported
 * the flattering one would pass forever while saying the opposite of the truth.
 *
 * The policy half bans `ViewEncapsulation.ShadowDom` because ARIA IDREFs do not
 * cross a shadow boundary (ADR-007 decision 8). A rule that stopped firing
 * would be invisible: the component would render, look right, and be
 * unlabelled.
 */
import { gzipSync } from 'node:zlib';
import { measure, overhead, kb } from './ssr-size.mjs';
import { encapsulationFindings } from './encapsulation-policy.mjs';

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/* ── measure ─────────────────────────────────────────────────────────────── */
{
  const html = '<div _ngcontent-x=""><span _nghost-y=""></span></div>';
  const m = measure('t', html);
  check('raw is the byte length, not the character count', m.raw === Buffer.byteLength(html));
  check('the scoping attributes are counted', m.ngcontent === 1 && m.nghost === 1);
  check(
    'gzip is real compression, not a copy',
    m.gzip === gzipSync(Buffer.from(html), { level: 9 }).byteLength,
  );
}
{
  // Multi-byte content: a length-based measurement would under-report here, and
  // SSR HTML carries user text.
  const html = '<p>ünïcödé — ✓</p>';
  const m = measure('t', html);
  check(
    'multi-byte text is measured in bytes',
    m.raw === Buffer.byteLength(html, 'utf8') && m.raw > html.length,
    `${m.raw} bytes for ${html.length} characters`,
  );
}

/* ── overhead ────────────────────────────────────────────────────────────── */
{
  const base = { name: 'none', raw: 100, gzip: 50, brotli: 25, ngcontent: 0, nghost: 0 };
  const subj = { name: 'emulated', raw: 188, gzip: 48, brotli: 28, ngcontent: 9, nghost: 1 };
  const o = overhead(base, subj);
  check(
    'overhead is measured ON TOP OF the baseline, not as a reduction from the subject',
    Math.round(o.raw) === 88,
    `reported ${o.raw.toFixed(1)}% (a "% smaller" reading would say 46.8)`,
  );
  check(
    'a subject that is SMALLER reports a negative overhead rather than zero',
    o.gzip < 0 && Math.round(o.gzip) === -4,
    `${o.gzip.toFixed(1)}% — this is the real result for emulated vs none, and rounding it up to 0 would hide it`,
  );
  check(
    'absolute byte deltas travel with the percentages',
    o.rawBytes === 88 && o.gzipBytes === -2,
  );
}
{
  const zero = { name: 'z', raw: 0, gzip: 0, brotli: 0, ngcontent: 0, nghost: 0 };
  const o = overhead(zero, { name: 's', raw: 10, gzip: 10, brotli: 10, ngcontent: 0, nghost: 0 });
  check('a zero baseline does not divide by zero silently', !Number.isNaN(o.raw));
}
check('kb() reports kibibytes to one decimal', kb(1536) === '1.5 KB');

/* ── the encapsulation policy ────────────────────────────────────────────── */
const read = (/** @type {string} */ f) => FIXTURES[f] ?? '';
/** @type {Record<string, string>} */
const FIXTURES = {
  '/r/ok.ts': `@Component({ selector: 'tk-a', template: '' })\nexport class A {}`,
  '/r/explicit-default.ts': `@Component({\n  encapsulation: ViewEncapsulation.Emulated,\n})\nexport class B {}`,
  '/r/shadow.ts': `@Component({\n  selector: 'tk-c',\n  encapsulation: ViewEncapsulation.ShadowDom,\n})\nexport class C {}`,
  '/r/none.ts': `@Component({\n  encapsulation: ViewEncapsulation.None,\n})\nexport class D {}`,
};

check(
  'a component that says nothing about encapsulation passes',
  encapsulationFindings(['/r/ok.ts'], read, '/r').length === 0,
);
check(
  'declaring the DEFAULT explicitly is not a violation',
  encapsulationFindings(['/r/explicit-default.ts'], read, '/r').length === 0,
  'Emulated is the decision, so writing it down is fine',
);
{
  const f = encapsulationFindings(['/r/shadow.ts'], read, '/r');
  check(
    'SHADOWDOM IS REPORTED — ARIA IDREFs do not cross a shadow boundary',
    f.length === 1 && f[0]?.cls === 'C' && /IDREF/.test(f[0]?.why ?? ''),
    f.length === 0 ? 'the ban is not enforced' : `flagged ${f[0]?.cls} at line ${f[0]?.line}`,
  );
}
{
  const f = encapsulationFindings(['/r/none.ts'], read, '/r');
  check(
    'None is reported, because it globalises every class name irreversibly',
    f.length === 1 && f[0]?.cls === 'D',
  );
}
{
  const f = encapsulationFindings(['/r/shadow.ts'], read, '/r', new Set(['shadow.ts:C']));
  check('a recorded exception suppresses one finding, by file AND class', f.length === 0);
}
{
  const f = encapsulationFindings(['/r/shadow.ts', '/r/none.ts', '/r/ok.ts'], read, '/r');
  check('every offending file is reported, not just the first', f.length === 2);
}

if (failed > 0) {
  console.error(`\n${failed} SSR-encapsulation self-test(s) failed — the gate is not trustworthy.`);
  process.exit(1);
}
console.log('\n✓ Overhead is reported in the costly direction, and the ShadowDom ban fires.');
