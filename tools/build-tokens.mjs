#!/usr/bin/env node
/**
 * TEKAD token build — ADR-007.
 *
 * Reads the two token sources and emits three things:
 *
 *   packages/theme/styles/tekad.css   the global sheet (the ONLY tier shipped)
 *   packages/theme/tokens.json        DTCG metadata, never a runtime dependency
 *   .nx/token-report.json             resolved values, for the contrast gate
 *
 * The shape of the output is where ADR-007's decisions actually live, so each
 * one is called out at the point it takes effect rather than only in the ADR:
 *
 *   PRIMITIVES DO NOT SHIP. `--_tekad-ref-*` exists only inside this script.
 *   A 5-family × 13-tone ramp is 65 custom properties; emitting them would put
 *   ~2 KB of unused declarations in every consumer's `:root` so that a handful
 *   of semantic tokens could reference them. They are resolved here instead.
 *
 *   ONE DECLARATION, TWO SCHEMES. `light-dark()` means a scheme is an attribute,
 *   not a re-declared token block under a descendant selector. That is the
 *   mechanism behind Material's 7.4 KB M3 theme versus ~108 KB for the M2
 *   per-component approach — a variant axis must never become a selector.
 *
 *   THE FALLBACK IS REAL. `light-dark()` is newer than Angular v22's browser
 *   floor, so an `@supports not (...)` block re-declares the tokens per scheme.
 *   It costs bytes, which is why it is emitted last and measured separately.
 *
 * Usage: node tools/build-tokens.mjs [--check] [--report <path>]
 *   --check         do not write; exit 1 if the committed output is out of date.
 *   --report <path> write the resolved-value report somewhere else. The default
 *                   is .nx/token-report.json, which is derived and not
 *                   committed — so anything that needs the report should ask
 *                   for it explicitly rather than depend on a previous step in
 *                   the job having left it behind.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitToSrgbGamut } from './lib/color.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THEME = join(ROOT, 'packages/theme');
const CHECK = process.argv.includes('--check');
const REPORT_INDEX = process.argv.indexOf('--report');
const REPORT_AT =
  REPORT_INDEX >= 0 && process.argv[REPORT_INDEX + 1]
    ? resolve(/** @type {string} */ (process.argv[REPORT_INDEX + 1]))
    : null;

/** @type {any} */
const palette = JSON.parse(readFileSync(join(THEME, 'tokens/palette.json'), 'utf8'));
/** @type {any} */
const semantic = JSON.parse(readFileSync(join(THEME, 'tokens/semantic.json'), 'utf8'));

/* ---------------- tier 1: resolve the primitive ramp, in memory ------------ */

/**
 * Tones are FITTED to the sRGB gamut, not clamped.
 *
 * `chromaScale` expresses the intended ramp shape — chroma tapering toward the
 * light and dark ends so the ramp reads as one family. But the achievable
 * maximum varies sharply with hue: at L=0.30 yellow runs out at roughly 0.063
 * chroma while blue reaches 0.174. A single hand-tuned table cannot be right
 * for every hue, and getting it wrong does not fail loudly — it silently clamps
 * the encoded channels, so the browser renders a colour the build never
 * checked and the WCAG assertion becomes a statement about a different colour.
 *
 * Fitting reduces chroma while holding lightness and hue, which are the two
 * attributes carrying the design intent. The value emitted is then always the
 * value checked.
 */
/** @type {Record<string, {hex: string, l: number, c: number, h: number}>} */
const primitives = {};
/** @type {{key: string, requested: number, actual: number}[]} */
const fitted = [];

for (const [family, def] of Object.entries(palette.families)) {
  const { hue, chroma } = /** @type {{hue: number, chroma: number}} */ (def);
  for (const tone of palette.tones) {
    const l = tone / 100;
    const scale = palette.chromaScale[String(tone)] ?? 1;
    const requested = chroma * scale;
    const fit = fitToSrgbGamut(l, requested, hue);
    const key = `${family}.${tone}`;
    primitives[key] = { hex: fit.hex, l, c: fit.c, h: hue };
    if (fit.clamped) fitted.push({ key, requested, actual: fit.c });
  }
}

/* ---------------- tier 2: the semantic layer ------------------------------- */

/**
 * @param {string} ref e.g. "brand.40"
 * @returns {string} hex
 */
function resolve_(ref) {
  const hit = primitives[ref];
  if (!hit) throw new Error(`unknown primitive tone: ${ref}`);
  return hit.hex;
}

/** @type {{name: string, light: string, dark: string, description?: string}[]} */
const colorTokens = [];
for (const [name, def] of Object.entries(semantic.color)) {
  const d = /** @type {any} */ (def);
  colorTokens.push({
    name,
    light: resolve_(d.light),
    dark: resolve_(d.dark),
    ...(d.$description ? { description: d.$description } : {}),
  });
}

/* ------------------------------ emit CSS ---------------------------------- */

const lines = [];
lines.push('/*');
lines.push(' * TEKAD theme — GENERATED by tools/build-tokens.mjs. Do not edit.');
lines.push(' * Source: packages/theme/tokens/{palette,semantic}.json');
lines.push(' *');
lines.push(' * Only the semantic tier appears here. Primitive tones are resolved at build');
lines.push(' * time and never shipped (ADR-007 decision 2).');
lines.push(' */');
lines.push('');
lines.push('/*');
lines.push(' * ADR-007 decision 1. This MUST be the first statement in the sheet: layer');
lines.push(' * order is fixed by first appearance, and an unlayered consumer rule beats');
lines.push(' * every layered rule regardless of specificity. That is what removes the need');
lines.push(' * for !important and ::ng-deep when a consumer overrides TEKAD.');
lines.push(' */');
lines.push('@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;');
lines.push('');
lines.push('@layer tekad.base {');
lines.push('  :root {');
lines.push('    /*');
lines.push('     * ADR-007 decision 3: color-scheme is the source of truth. It also tells');
lines.push('     * the UA to theme form controls, scrollbars and the canvas, which no');
lines.push('     * custom property can do.');
lines.push('     */');
lines.push('    color-scheme: light dark;');
lines.push('');
for (const t of colorTokens) {
  if (t.description) lines.push(`    /* ${t.description} */`);
  lines.push(`    --tekad-sys-color-${t.name}: light-dark(${t.light}, ${t.dark});`);
}
lines.push('');
lines.push("    /* Spacing. A 4px step expressed in rem, so it tracks the user's font size. */");
for (const [k, v] of Object.entries(semantic.space)) {
  if (k.startsWith('$')) continue;
  lines.push(`    --tekad-sys-space-${k}: ${v};`);
}
lines.push('');
for (const [k, v] of Object.entries(semantic.radius)) {
  if (k.startsWith('$')) continue;
  lines.push(`    --tekad-sys-radius-${k}: ${v};`);
}
lines.push('');
lines.push('    /*');
lines.push('     * Density is ONE multiplier, not a set of density-specific rules. A');
lines.push('     * component multiplies its own spacing by it, so changing density adds no');
lines.push('     * CSS at all (ADR-007 governing rule).');
lines.push('     */');
lines.push(`    --tekad-sys-density-scale: ${semantic.density.scale};`);
lines.push('  }');
lines.push('');
lines.push('  /*');
lines.push('   * ADR-007 decision 3: [data-tekad-scheme] is the CONTROL SURFACE. Setting');
lines.push('   * color-scheme on a subtree is all a dark island needs — every light-dark()');
lines.push('   * above resolves against it, so no token is re-declared and nothing is');
lines.push('   * scoped by a descendant selector.');
lines.push('   */');
lines.push("  [data-tekad-scheme='light'] { color-scheme: light; }");
lines.push("  [data-tekad-scheme='dark'] { color-scheme: dark; }");
lines.push('}');
lines.push('');
lines.push('/*');
lines.push(" * FALLBACK. light-dark() is newer than Angular v22's browser floor, so where it");
lines.push(' * is unsupported the tokens are re-declared per scheme — the very pattern the');
lines.push(' * main sheet exists to avoid. It is isolated here so its cost is visible and');
lines.push(' * can be dropped in one edit when the floor moves (ADR-007 decision 3).');
lines.push(' */');
lines.push('@supports not (color: light-dark(#000, #fff)) {');
lines.push('  @layer tekad.base {');
lines.push('    :root {');
for (const t of colorTokens) lines.push(`      --tekad-sys-color-${t.name}: ${t.light};`);
lines.push('    }');
lines.push('');
lines.push('    @media (prefers-color-scheme: dark) {');
lines.push('      :root {');
for (const t of colorTokens) lines.push(`        --tekad-sys-color-${t.name}: ${t.dark};`);
lines.push('      }');
lines.push('    }');
lines.push('');
lines.push("    [data-tekad-scheme='light'] {");
for (const t of colorTokens) lines.push(`      --tekad-sys-color-${t.name}: ${t.light};`);
lines.push('    }');
lines.push('');
lines.push("    [data-tekad-scheme='dark'] {");
for (const t of colorTokens) lines.push(`      --tekad-sys-color-${t.name}: ${t.dark};`);
lines.push('    }');
lines.push('  }');
lines.push('}');
lines.push('');

const css = lines.join('\n');

/* --------------------- emit DTCG metadata (ADR-007 decision 9) ------------- */

/** @type {Record<string, unknown>} */
const dtcgColor = {};
for (const t of colorTokens) {
  dtcgColor[t.name] = {
    $type: 'color',
    $value: t.light,
    ...(t.description ? { $description: t.description } : {}),
    $extensions: {
      'com.tekad.scheme': { light: t.light, dark: t.dark },
    },
  };
}
/** @type {Record<string, unknown>} */
const dtcgSpace = {};
for (const [k, v] of Object.entries(semantic.space)) {
  if (!k.startsWith('$')) dtcgSpace[k] = { $type: 'dimension', $value: v };
}
/** @type {Record<string, unknown>} */
const dtcgRadius = {};
for (const [k, v] of Object.entries(semantic.radius)) {
  if (!k.startsWith('$')) dtcgRadius[k] = { $type: 'dimension', $value: v };
}

const dtcg = {
  $schema: 'https://tr.designtokens.org/format/2025.10/',
  $description:
    'TEKAD semantic design tokens. Metadata for design tooling — NEVER a runtime ' +
    'dependency (ADR-007 decision 9). The shipped artefact is styles/tekad.css.',
  color: dtcgColor,
  space: dtcgSpace,
  radius: dtcgRadius,
};

/* --------------- the resolved report the contrast gate reads --------------- */

const report = {
  generatedAt: 'build',
  primitives: Object.fromEntries(Object.entries(primitives).map(([k, v]) => [k, { hex: v.hex }])),
  semantic: Object.fromEntries(
    Object.entries(semantic.color).map(([name, def]) => {
      const d = /** @type {any} */ (def);
      return [
        name,
        {
          light: resolve_(d.light),
          dark: resolve_(d.dark),
          lightRef: d.light,
          darkRef: d.dark,
          ...(d.contrastWith ? { contrastWith: d.contrastWith, level: d.level } : {}),
        },
      ];
    }),
  ),
};

/* -------------------------------- write ----------------------------------- */

const cssPath = join(THEME, 'styles/tekad.css');
const dtcgPath = join(THEME, 'tokens.json');
const reportPath = REPORT_AT ?? join(ROOT, '.nx/token-report.json');
const dtcgText = JSON.stringify(dtcg, null, 2) + '\n';

if (CHECK) {
  const stale = [];
  if (!existsSync(cssPath) || readFileSync(cssPath, 'utf8') !== css) stale.push(cssPath);
  if (!existsSync(dtcgPath) || readFileSync(dtcgPath, 'utf8') !== dtcgText) stale.push(dtcgPath);
  if (stale.length) {
    console.error('✗ Generated token output is out of date:');
    for (const f of stale) console.error(`    ${f}`);
    console.error('\n  Run `pnpm run tokens` and commit the result.');
    process.exit(1);
  }
  // The report is derived, not committed, so refresh it even in check mode.
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('✓ Generated token output is up to date.');
} else {
  mkdirSync(dirname(cssPath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(cssPath, css);
  writeFileSync(dtcgPath, dtcgText);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`✓ Wrote ${cssPath}`);
  console.log(`✓ Wrote ${dtcgPath}`);
  if (fitted.length) {
    console.log(
      `  ${fitted.length} tone(s) had chroma reduced to fit sRGB (lightness and hue preserved):`,
    );
    for (const f of fitted.slice(0, 6)) {
      console.log(`    ${f.key}: ${f.requested.toFixed(3)} -> ${f.actual.toFixed(3)}`);
    }
    if (fitted.length > 6) console.log(`    ...and ${fitted.length - 6} more`);
  }
  console.log(
    `  ${colorTokens.length} colour tokens, ` +
      `${Object.keys(dtcgSpace).length} space, ${Object.keys(dtcgRadius).length} radius; ` +
      `every emitted tone inside the sRGB gamut.`,
  );
}
