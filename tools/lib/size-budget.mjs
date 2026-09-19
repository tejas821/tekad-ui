/**
 * TEKAD — per-entry-point byte budgets, and the comparison that enforces them.
 *
 * `docs/architecture/05-performance-budgets.md` wrote the rule long before there
 * was anything to weigh:
 *
 *   "Baselines are established when the first vertical slice exists (Phase 9),
 *    not before. Numeric budgets written today would be invented, not measured."
 *
 * Phase 9 exists, so the numbers in `tools/size-budget.json` are measurements,
 * not targets. This file is the other half of that: the arithmetic that decides
 * whether a run is a regression.
 *
 * ── What is measured, and what is deliberately not ────────────────────────
 *
 * The packed tarball, because that is what a consumer downloads, and every FESM
 * entry point inside it in raw, gzip and brotli. All three axes are enforced
 * because they fail independently: a repeated 27-byte attribute makes raw size
 * explode and compressed size *shrink* (measured in
 * `docs/architecture/15-ssr-encapsulation.md`), so a budget on gzip alone would
 * have called that change an improvement on one axis and missed it entirely on
 * another.
 *
 * Not measured here: what a consumer's *bundle* contains after tree-shaking.
 * That is `verify-treeshaking.mjs`, and it answers a different question — this
 * gate says what the package costs if you import everything in it.
 *
 * ── Why the tolerance exists, and why it is in the committed file ─────────
 *
 * A budget with no tolerance turns every incidental byte into a manual
 * re-baseline, and a budget that is re-baselined without reading it is a budget
 * nobody is enforcing. The tolerance is small, committed and typed, so raising
 * it is a visible decision in a diff rather than a default. Shrinking is always
 * accepted — a budget is a ceiling, not a target.
 */

/**
 * @typedef {{ raw: number, gzip: number, brotli: number }} Bytes
 * @typedef {{ packed: number, entryPoints: Record<string, Bytes> }} PackageBudget
 * @typedef {{ tolerancePercent: number, packages: Record<string, PackageBudget> }} Budget
 * @typedef {{ name: string, packed: number, entryPoints: Record<string, Bytes> }} Measurement
 */

/** The axes a budget is enforced on, in the order they are reported. */
export const AXES = /** @type {const} */ (['raw', 'gzip', 'brotli']);

/**
 * Compare what was measured against what was committed.
 *
 * @param {Budget} budget
 * @param {Measurement[]} measured
 * @returns {{failures: string[], notes: string[]}}
 */
export function compare(budget, measured) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const notes = [];

  const tolerance = budget.tolerancePercent;
  /** A measurement is over budget once it exceeds the committed bytes by more than the tolerance. */
  const over = (/** @type {number} */ was, /** @type {number} */ now) =>
    was === 0 ? now > 0 : now > was * (1 + tolerance / 100);

  const seen = new Set(measured.map((m) => m.name));

  for (const m of measured) {
    const pkg = budget.packages[m.name];
    if (!pkg) {
      failures.push(
        `${m.name}: no committed budget. A new package or entry point must have its measured ` +
          'bytes written into tools/size-budget.json in the same change — that number is the ' +
          'whole point of the file.',
      );
      continue;
    }

    if (over(pkg.packed, m.packed)) {
      failures.push(
        `${m.name}: the packed tarball is ${bytes(m.packed)}, budget ${bytes(pkg.packed)} ` +
          `(+${percent(pkg.packed, m.packed)}, tolerance ${tolerance}%).`,
      );
    } else if (m.packed < pkg.packed) {
      notes.push(
        `${m.name}: ${bytes(pkg.packed - m.packed)} smaller than budget — shrink the committed ` +
          'number so the next change is measured against reality.',
      );
    }

    const budgeted = new Set(Object.keys(pkg.entryPoints));
    for (const entry of Object.keys(m.entryPoints)) {
      const was = pkg.entryPoints[entry];
      const now = m.entryPoints[entry];
      if (!was || !now) {
        failures.push(
          `${m.name}${entry === '.' ? '' : entry.slice(1)}: measured but not budgeted. Add it to ` +
            'tools/size-budget.json — an unbudgeted entry point is one nobody is watching.',
        );
        continue;
      }
      budgeted.delete(entry);
      for (const axis of AXES) {
        if (over(was[axis], now[axis])) {
          failures.push(
            `${m.name}${entry === '.' ? '' : entry.slice(1)} ${axis}: ${bytes(now[axis])}, ` +
              `budget ${bytes(was[axis])} (+${percent(was[axis], now[axis])}, tolerance ` +
              `${tolerance}%).`,
          );
        }
      }
    }

    for (const stale of budgeted) {
      failures.push(
        `${m.name}${stale === '.' ? '' : stale.slice(1)}: budgeted and no longer built. A stale ` +
          'budget is a claim of coverage with nothing behind it; delete it deliberately.',
      );
    }
  }

  for (const name of Object.keys(budget.packages)) {
    if (!seen.has(name)) {
      failures.push(
        `${name}: budgeted and not measured. Either it stopped being built, or the gate stopped ` +
          'packing it — both make this file a lie about coverage.',
      );
    }
  }

  return { failures, notes };
}

/**
 * Reduce a packed package to the numbers a budget is expressed in.
 *
 * The key is the public subpath from the tarball's own exports map, so the
 * budget cannot drift from the public surface: rename an entry point and the
 * gate reports a budget for an entry point nobody measured, rather than
 * continuing to compare the new name against the old numbers.
 *
 * @param {import('./tarball.mjs').PackedPackage} pkg
 * @param {(input: Buffer) => Bytes} measure
 * @returns {Measurement}
 */
export function measurePackage(pkg, measure) {
  /** @type {Record<string, Bytes>} */
  const entryPoints = {};
  /** @type {Record<string, any>} */
  const exportsMap = pkg.manifest.exports ?? {};

  for (const [subpath, target] of Object.entries(exportsMap)) {
    if (subpath === './package.json') continue;
    const files = Object.values(
      typeof target === 'string'
        ? { default: target }
        : /** @type {Record<string, string>} */ (target),
    );
    const fesm = files.find((f) => typeof f === 'string' && /\.mjs$/.test(f));
    if (!fesm) continue;
    const rel = fesm.replace(/^\.\//, '');
    const file = pkg.read(rel);
    if (!file) continue;
    entryPoints[subpath] = measure(file);
  }

  return { name: pkg.name, packed: pkg.size, entryPoints };
}

/**
 * @param {number} n
 */
export function bytes(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(2)} KB`;
}

/**
 * @param {number} was
 * @param {number} now
 */
function percent(was, now) {
  if (was === 0) return '∞%';
  return `${(((now - was) / was) * 100).toFixed(1)}%`;
}
