#!/usr/bin/env node
/**
 * TEKAD CI gate 12 — dependency vulnerability audit.
 *
 * `pnpm audit --audit-level=high` on its own has one failure mode that matters
 * for a library monorepo: it reports advisories in BUILD TOOLING that can have
 * no patched version, and the only ways to get a green build are to lower the
 * threshold or add `--no-audit`. Both disable the gate permanently, and both
 * look like housekeeping in a diff.
 *
 * So the same shape as the licence gate (ADR-015's audit rule) is applied here:
 *
 *   PRODUCTION scope (`pnpm audit --prod`) — reachable at a consumer's runtime.
 *     A high advisory is FATAL. There is no exception path.
 *
 *   FULL scope — fatal UNLESS recorded in tools/audit-exceptions.json with a
 *     justification AND an expiry date. The expiry is the point: an unpatched
 *     advisory in build tooling is a decision to revisit, not a fact to file
 *     away, and an expired entry fails the build so someone has to look again.
 *
 * Usage:
 *   pnpm audit --prod --audit-level=high --json > .nx/audit-prod.json
 *   pnpm audit        --audit-level=high --json > .nx/audit-all.json
 *   node tools/verify-audit.mjs .nx/audit-prod.json .nx/audit-all.json
 *
 * `pnpm audit` exits non-zero when it finds anything, so the CI step must pipe
 * to a file with `|| true` and let THIS script decide the outcome.
 *
 * Exit 0 = clean or fully excepted. Exit 1 = an unexcused advisory.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.argv[2] ?? join(ROOT, '.nx/audit-prod.json');
const ALL = process.argv[3] ?? join(ROOT, '.nx/audit-all.json');
const EXCEPTIONS_FILE = process.argv[4] ?? join(ROOT, 'tools/audit-exceptions.json');
const TODAY = process.argv[5] ?? new Date().toISOString().slice(0, 10);

/**
 * @typedef {{id: string, module: string, severity: string, title: string, patched: string}} Advisory
 * @param {string} file
 * @returns {Advisory[]}
 */
function load(file) {
  if (!existsSync(file)) {
    console.error(`verify-audit: ${file} not found.`);
    console.error('Run: pnpm audit --prod --audit-level=high --json > .nx/audit-prod.json || true');
    console.error('     pnpm audit        --audit-level=high --json > .nx/audit-all.json  || true');
    process.exit(1);
  }
  const text = readFileSync(file, 'utf8').trim();
  if (!text) return [];
  /** @type {{advisories?: Record<string, {module_name?: string, severity?: string, title?: string, patched_versions?: string}>}} */
  const raw = JSON.parse(text);
  return Object.entries(raw.advisories ?? {}).map(([id, a]) => ({
    id,
    module: a.module_name ?? '(unknown)',
    severity: a.severity ?? 'unknown',
    title: a.title ?? '',
    patched: a.patched_versions ?? 'none',
  }));
}

/** @type {{module: string, advisory?: string, justification: string, expires: string}[]} */
const exceptions = existsSync(EXCEPTIONS_FILE)
  ? (JSON.parse(readFileSync(EXCEPTIONS_FILE, 'utf8')).exceptions ?? [])
  : [];

/**
 * @param {Advisory} adv
 * @returns {{ok: boolean, reason: string, expired?: boolean}}
 */
function exceptionFor(adv) {
  const e = exceptions.find(
    (x) => x.module === adv.module && (!x.advisory || x.advisory === adv.id),
  );
  if (!e) return { ok: false, reason: 'no recorded exception' };
  if (e.expires < TODAY) {
    return { ok: false, expired: true, reason: `exception expired on ${e.expires}` };
  }
  return { ok: true, reason: `${e.justification} (expires ${e.expires})` };
}

const prod = load(PROD);
const all = load(ALL);

let failed = false;

console.log(
  `Vulnerability audit\n  production scope: ${prod.length} advisory(ies)\n  full scope:       ${all.length} advisory(ies)\n`,
);

if (prod.length > 0) {
  failed = true;
  console.error('✗ ADVISORY IN THE PRODUCTION DEPENDENCY TREE.');
  console.error('  This is shipped code. There is no exception path.');
  for (const a of prod) {
    console.error(`    ${a.module} — ${a.severity} — ${a.title}`);
    console.error(`      patched in: ${a.patched}`);
  }
  console.error('');
}

/** @typedef {Advisory & {reason: string, expired: boolean}} ReviewedAdvisory */
/** @type {ReviewedAdvisory[]} */ const unexcused = [];
/** @type {ReviewedAdvisory[]} */ const excused = [];
for (const a of all) {
  // Anything already reported in the production scope is handled above.
  if (prod.some((p) => p.id === a.id)) continue;
  const e = exceptionFor(a);
  (e.ok ? excused : unexcused).push({ ...a, reason: e.reason, expired: e.expired === true });
}

if (unexcused.length > 0) {
  failed = true;
  console.error('✗ ADVISORY IN BUILD TOOLING without a current recorded exception.');
  for (const a of unexcused) {
    console.error(`    ${a.module} — ${a.severity} — ${a.title}`);
    console.error(`      patched in: ${a.patched}`);
    console.error(`      ${a.expired ? 'EXPIRED: ' : ''}${a.reason}`);
  }
  console.error(
    `\n  Fix it (an override in pnpm-workspace.yaml is usually enough), or record an\n` +
      `  exception in ${EXCEPTIONS_FILE} with a justification and an expiry date.\n` +
      `  Do NOT lower --audit-level; that disables the gate for everything.\n`,
  );
}

if (excused.length > 0) {
  console.log(`  ${excused.length} advisory(ies) excepted in build tooling:`);
  for (const a of excused) console.log(`    ${a.module} — ${a.reason}`);
  console.log('');
}

if (failed) {
  console.error('Vulnerability audit FAILED.');
  process.exit(1);
}

console.log('✓ No advisory in the production tree, and every build-tooling');
console.log('  exception is justified and unexpired.');
