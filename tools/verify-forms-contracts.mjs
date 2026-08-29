#!/usr/bin/env node
/**
 * TEKAD — a control must not implement both forms contracts.
 *
 * ADR-013 said Angular forbids this. It does not. Measured against
 * `@angular/forms` 22.1.4 in a real browser
 * (`tools/verify-forms-assumptions.mjs`):
 *
 *   Angular ACCEPTED a component implementing both `ControlValueAccessor` and
 *   `FormValueControl`. No error. No warning. Boot succeeded. The CVA's
 *   `writeValue` was called twice with the right value, and the signal-forms
 *   `value` model NEVER BOUND — the control rendered an empty string where the
 *   field said `"changed-both"`.
 *
 * `FormField.ɵngControlCreate` resolves `if (controlValueAccessor) ... else if
 * (customControl) ...`, so the CVA simply wins and the signal contract is never
 * consulted.
 *
 * That is worse than a prohibition. A prohibition fails loudly at the moment
 * you make the mistake. This compiles, boots, renders, and passes any test that
 * only checks the control appears — while the value silently does not flow.
 *
 * So this gate is not belt-and-braces. It is the only thing between TEKAD and a
 * control that looks correct and is not.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 * Two ways of taking on the CVA contract, because a class can do it without
 * naming the interface:
 *
 *   1. `implements ... ControlValueAccessor` alongside a signal-forms contract;
 *   2. providing `NG_VALUE_ACCESSOR` in a class that also declares a `value` or
 *      `checked` model — which is how you get a CVA registered without ever
 *      writing the word.
 *
 * Usage: node tools/verify-forms-contracts.mjs [packagesDir]
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'packages');

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/**
 * Split a file into class bodies so the checks are per-class rather than
 * per-file. A package may legitimately contain a signal-forms control in one
 * file and a CVA adapter in another — the rule is about ONE class doing both.
 *
 * @param {string} text
 * @returns {{name: string, heritage: string, body: string, line: number}[]}
 */
function classes(text) {
  /** @type {{name: string, heritage: string, body: string, line: number}[]} */
  const out = [];
  const re = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)([^{]*)\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    out.push({
      name: m[1] ?? '(anonymous)',
      heritage: m[2] ?? '',
      body: text.slice(start, i),
      line: text.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

/** @type {{file: string, cls: string, line: number, why: string}[]} */
const violations = [];
let classesChecked = 0;

for (const file of walk(PACKAGES)) {
  const text = readFileSync(file, 'utf8');
  // A component's providers array can sit above the class, so search the file
  // for the token and attribute it to the class it decorates.
  for (const c of classes(text)) {
    classesChecked++;

    const signalContract = /\bimplements\b[^{]*\b(FormValueControl|FormCheckboxControl)\b/.test(
      c.heritage,
    );
    const declaresValueModel = /\b(value|checked)\s*(?::[^=]*)?=\s*model\s*[<(]/.test(c.body);
    const isSignalControl = signalContract || declaresValueModel;
    if (!isSignalControl) continue;

    if (/\bimplements\b[^{]*\bControlValueAccessor\b/.test(c.heritage)) {
      violations.push({
        file: relative(ROOT, file),
        cls: c.name,
        line: c.line,
        why: 'implements ControlValueAccessor alongside a signal-forms contract',
      });
      continue;
    }

    // Providing NG_VALUE_ACCESSOR registers a CVA without naming the interface.
    // Look just above the class, where the decorator lives.
    const before = text.slice(0, text.indexOf(`class ${c.name}`));
    const decoratorStart = before.lastIndexOf('@Component');
    const decorator = decoratorStart >= 0 ? before.slice(decoratorStart) : before.slice(-1200);
    if (/NG_VALUE_ACCESSOR/.test(decorator)) {
      violations.push({
        file: relative(ROOT, file),
        cls: c.name,
        line: c.line,
        why: 'provides NG_VALUE_ACCESSOR while declaring a signal-forms value/checked model',
      });
    }
  }
}

if (violations.length > 0) {
  console.error('\n✗ A control takes on BOTH forms contracts.\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  class ${v.cls}`);
    console.error(`    ${v.why}\n`);
  }
  console.error(
    'Angular does NOT reject this — measured in 22.1.4, it accepts the component,\n' +
      'silently prefers the ControlValueAccessor, and never binds the signal-forms\n' +
      'value model. The control compiles, boots, renders, and does not work.\n\n' +
      'Reactive-forms support belongs in a SEPARATE adapter in @tekad/forms/compat\n' +
      '(ADR-013), never as a second interface on the control itself.\n' +
      'Evidence: tools/verify-forms-assumptions.mjs\n',
  );
  process.exit(1);
}

console.log(`✓ No control implements both forms contracts (${classesChecked} class(es) checked).`);
