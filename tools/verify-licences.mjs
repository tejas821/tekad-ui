#!/usr/bin/env node
/**
 * TEKAD CI gate 13 — licence audit of the dependency tree.
 *
 * ADR-015 records the rule this script implements:
 *
 *   "The npm `license` FIELD is a screening signal, not evidence — PrimeNG's
 *    went opaque at v18, four majors before the substantive change at v22.
 *    The CI licence gate reads the LICENSE file."
 *
 * ── Two scopes, two severities ────────────────────────────────────────────
 *
 * ADR-015's reasoning is about SHIPPED code: "an Angular library is compiled
 * and tree-shaken into the consumer's bundle, so copyleft is commercially
 * fatal". That argument does not apply to a bundler or a d.ts rollup plugin
 * that runs on a build machine and ships nothing.
 *
 * So the audit runs twice:
 *
 *   PRODUCTION scope (`pnpm licenses list --prod`) — anything reachable at a
 *     consumer's runtime. A forbidden licence here is FATAL, no exception path.
 *
 *   FULL scope (production + dev tooling) — fatal UNLESS listed in
 *     tools/licence-exceptions.json with a written justification. A new one
 *     still fails, so the list is a reviewed record, not a silent allowance.
 *
 * ── Two passes per package ────────────────────────────────────────────────
 *
 *   1. SCREEN the declared SPDX field.
 *   2. VERIFY by reading the actual LICENSE text. A package that DECLARES
 *      something permissive but whose LICENSE file carries a copyleft or
 *      source-available grant is the failure mode ADR-015 exists to catch.
 *
 * Pass 2 is a HEURISTIC, and deliberately conservative about it: a licence name
 * counts as a contradiction only when it appears as a TITLE — near the top of
 * the file, or on a line that is essentially just that title. The naive
 * substring version flagged `argparse`, whose Python-2.0 text mentions the GPL
 * in a historical paragraph 200 lines in. Precision matters more than recall
 * here, because a gate that cries wolf gets switched off.
 *
 * Usage:
 *   pnpm licenses list --prod --json > /tmp/lic-prod.json
 *   pnpm licenses list        --json > /tmp/lic-all.json
 *   node tools/verify-licences.mjs /tmp/lic-prod.json /tmp/lic-all.json
 *
 * Exit 0 = clean. Exit 1 = a forbidden or contradicted licence.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROD_REPORT = process.argv[2] ?? '/tmp/lic-prod.json';
const ALL_REPORT = process.argv[3] ?? '/tmp/lic-all.json';
const EXCEPTIONS_FILE = process.argv[4] ?? join(ROOT, 'tools/licence-exceptions.json');

/* ADR-015 / docs/research/14-license-analysis.md — permissive, and compatible
 * with an Apache-2.0 distribution. */
const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'Apache-2.0 WITH LLVM-exception',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
  'BlueOak-1.0.0',
  'Python-2.0',
  'WTFPL',
]);

const FORBIDDEN = [
  /\bAGPL\b/i,
  /\bGPL-[23]/i,
  /\bLGPL\b/i,
  /\bMPL-2\.0\b/i,
  /\bSSPL\b/i,
  /\bBUSL\b/i,
  /Business Source/i,
  /\bElastic-2\.0\b/i,
  /\bCC-BY-NC\b/i,
  /Commons Clause/i,
];

/** Licence grants whose TITLE in a LICENSE file contradicts a permissive
 *  declaration. Ordered most specific first. */
const TEXT_MARKERS = [
  { re: /GNU AFFERO GENERAL PUBLIC LICENSE/i, name: 'AGPL' },
  { re: /GNU LESSER GENERAL PUBLIC LICENSE/i, name: 'LGPL' },
  { re: /GNU GENERAL PUBLIC LICENSE/i, name: 'GPL' },
  { re: /Mozilla Public License/i, name: 'MPL' },
  { re: /Server Side Public License/i, name: 'SSPL' },
  { re: /Business Source License/i, name: 'BUSL' },
  { re: /Elastic License/i, name: 'Elastic' },
  { re: /Commons Clause/i, name: 'Commons Clause' },
  { re: /Attribution-NonCommercial/i, name: 'CC-BY-NC' },
];

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'License',
  'license',
  'license.md',
];

/**
 * How much text may surround a licence name on its own line before the line
 * reads as prose rather than a heading. "GNU LESSER GENERAL PUBLIC LICENSE
 * Version 3, 29 June 2007" leaves 23 characters once the name is removed;
 * argparse's "previously distributed under the GNU General Public License
 * (GPL), the" leaves 43 and is narrative.
 */
const TITLE_RESIDUE_MAX = 28;

/**
 * Does `text` GRANT this licence, as opposed to merely mentioning it?
 *
 * A grant announces itself as a heading: the licence name occupies the line,
 * with at most a version and a date beside it. A mention sits inside a
 * sentence. Removing the matched name and measuring what is left separates the
 * two far more reliably than line position or raw length — the naive version of
 * this check flagged `argparse`, whose Python-2.0 text recounts its own history
 * two hundred lines in.
 *
 * This is a HEURISTIC. It is tuned for precision: a false positive here trains
 * people to ignore the gate, which is worse than the miss it prevents.
 *
 * @param {string} text
 * @param {RegExp} re
 * @returns {boolean}
 */
function grantsLicence(text, re) {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const m = re.exec(line);
    if (!m) continue;
    const residue = line
      .replace(m[0], '')
      // a version and date beside the title are part of the heading
      .replace(/version\s*[\d.]+/i, '')
      .replace(/\d{1,2}\s+\w+\s+\d{4}/, '')
      .replace(/[,.;:()\-\s]/g, '');
    if (residue.length <= TITLE_RESIDUE_MAX) return true;
  }
  return false;
}

/**
 * Read a package's own LICENSE file, if it ships one.
 * @param {string | undefined} dir
 * @returns {string | null}
 */
function readLicenceText(dir) {
  if (!dir || !existsSync(dir)) return null;
  for (const f of LICENSE_FILES) {
    const p = join(dir, f);
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf8');
      } catch {
        /* unreadable — treat as absent */
      }
    }
  }
  try {
    const hit = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
    if (hit) return readFileSync(join(dir, hit), 'utf8');
  } catch {
    /* not a readable directory */
  }
  return null;
}

/**
 * @param {string} declared
 * @returns {boolean} true if every alternative in the expression is allowed
 */
function declarationIsAllowed(declared) {
  if (ALLOWED.has(declared)) return true;
  const parts = declared
    .replace(/[()]/g, '')
    .split(/\s+OR\s+|\s+AND\s+/i)
    .map((s) => s.trim());
  return parts.length > 1 && parts.every((p) => ALLOWED.has(p));
}

/**
 * @typedef {{id: string, name: string, declared: string, dirs: string[]}} Pkg
 * @param {string} file
 * @returns {Pkg[]}
 */
function loadReport(file) {
  if (!existsSync(file)) {
    console.error(`verify-licences: ${file} not found.`);
    console.error('Run: pnpm licenses list --prod --json > /tmp/lic-prod.json');
    console.error('     pnpm licenses list        --json > /tmp/lic-all.json');
    process.exit(1);
  }
  /** @type {Record<string, {name: string, version?: string, versions?: string[], path?: string, paths?: string[]}[]>} */
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  /** @type {Pkg[]} */
  const out = [];
  for (const [declared, packages] of Object.entries(raw)) {
    for (const p of packages) {
      out.push({
        id: `${p.name}@${p.version ?? p.versions?.join(',') ?? '?'}`,
        name: p.name,
        declared,
        dirs: p.paths ?? (p.path ? [p.path] : []),
      });
    }
  }
  return out;
}

/** Reviewed, justified exceptions — build tooling only, never shipped code. */
/** @type {{package: string, licence: string, justification: string}[]} */
const exceptions = existsSync(EXCEPTIONS_FILE)
  ? (JSON.parse(readFileSync(EXCEPTIONS_FILE, 'utf8')).exceptions ?? [])
  : [];

/**
 * @param {string} name
 * @param {string} declared
 * @returns {boolean}
 */
function isExcepted(name, declared) {
  return exceptions.some((e) => e.package === name && e.licence === declared);
}

/**
 * @param {Pkg[]} packages
 * @param {'production' | 'full'} scope
 */
function audit(packages, scope) {
  /** @type {Pkg[]} */ const forbidden = [];
  /** @type {(Pkg & {foundInText: string})[]} */ const contradicted = [];
  /** @type {Pkg[]} */ const unknown = [];
  /** @type {Pkg[]} */ const unverified = [];
  /** @type {Pkg[]} */ const excepted = [];

  for (const pkg of packages) {
    /* pass 1 — declared field */
    if (FORBIDDEN.some((re) => re.test(pkg.declared))) {
      if (scope === 'full' && isExcepted(pkg.name, pkg.declared)) excepted.push(pkg);
      else forbidden.push(pkg);
      continue;
    }
    if (!declarationIsAllowed(pkg.declared)) unknown.push(pkg);

    /* pass 2 — the actual LICENSE text */
    /** @type {(string | null)[]} */
    const texts = pkg.dirs.map(/** @param {string} d */ (d) => readLicenceText(d));
    const text = texts.find((t) => t);
    if (!text) {
      unverified.push(pkg);
      continue;
    }
    for (const marker of TEXT_MARKERS) {
      if (grantsLicence(text, marker.re)) {
        if (scope === 'full' && isExcepted(pkg.name, pkg.declared)) excepted.push(pkg);
        else contradicted.push({ ...pkg, foundInText: marker.name });
        break;
      }
    }
  }

  return { forbidden, contradicted, unknown, unverified, excepted, total: packages.length };
}

/* --------------------------------- run ----------------------------------- */
const prod = audit(loadReport(PROD_REPORT), 'production');
const all = audit(loadReport(ALL_REPORT), 'full');

let failed = false;

console.log(
  `Licence audit\n  production scope: ${prod.total} package(s)\n  full scope:       ${all.total} package(s)\n`,
);

if (prod.forbidden.length || prod.contradicted.length) {
  failed = true;
  console.error('✗ FORBIDDEN LICENCE IN THE PRODUCTION DEPENDENCY TREE.');
  console.error('  This is shipped code. There is no exception path for it (ADR-015).');
  for (const p of prod.forbidden) console.error(`    ${p.id} — declares ${p.declared}`);
  for (const c of prod.contradicted) {
    console.error(`    ${c.id} — declares "${c.declared}", LICENSE text GRANTS ${c.foundInText}`);
  }
  console.error('');
}

if (all.forbidden.length || all.contradicted.length) {
  failed = true;
  console.error('✗ FORBIDDEN LICENCE IN BUILD TOOLING, not on the reviewed exception list.');
  console.error('  Build tooling ships nothing, so this can be excepted — but only in writing.');
  console.error(
    `  Add an entry to ${EXCEPTIONS_FILE} with a justification, or drop the dependency.`,
  );
  for (const p of all.forbidden) console.error(`    ${p.id} — declares ${p.declared}`);
  for (const c of all.contradicted) {
    console.error(`    ${c.id} — declares "${c.declared}", LICENSE text GRANTS ${c.foundInText}`);
  }
  console.error('');
}

if (all.excepted.length) {
  console.log(`  ${all.excepted.length} reviewed exception(s) in build tooling:`);
  for (const e of all.excepted) {
    const why = exceptions.find((x) => x.package === e.name)?.justification ?? '';
    console.log(`    ${e.id} — ${e.declared}: ${why}`);
  }
  console.log('');
}

if (all.unknown.length) {
  console.warn('! Declared licence not on the allowlist — needs a human decision:');
  for (const u of all.unknown) console.warn(`    ${u.id} — ${u.declared}`);
  console.warn('');
}

if (all.unverified.length) {
  console.warn(
    `! ${all.unverified.length} package(s) ship no readable LICENSE file — UNVERIFIED, not clean.`,
  );
  console.warn('');
}

if (failed) {
  console.error('Licence audit FAILED. See docs/research/14-license-analysis.md and ADR-015.');
  process.exit(1);
}

console.log('✓ No forbidden or contradicted licence in the production tree,');
console.log('  and every build-tooling exception is reviewed and recorded.');
