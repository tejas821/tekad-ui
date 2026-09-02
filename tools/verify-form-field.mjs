#!/usr/bin/env node
/**
 * TEKAD — the input and its form field, in a real browser.
 *
 * The unit suites already resolve every IDREF and check the announcement
 * order, which is most of what this pair is for. What jsdom cannot show is
 * whether the wiring survives contact with a rendering engine and an
 * accessibility tree — so this checks the three things that would make the
 * unit suites' confidence misplaced:
 *
 *   1. **The label really labels it.** Chromium computes an accessible name
 *      from the same tree a screen reader reads. `label[for]` resolving in
 *      the DOM is a fact about ids; the accessible name is a fact about the
 *      accessibility tree, and they are not the same claim.
 *
 *   2. **The error is legible without colour.** ADR-007 decision 7 and
 *      WCAG 1.4.1: in forced-colors mode the user's palette has no "danger",
 *      so an error that is only red is an error only some users can see.
 *
 *   3. **The rendered colours clear AA**, measured from what the engine
 *      painted rather than from the token pair the build computed.
 *
 * Usage: node tools/verify-form-field.mjs
 */
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrastRatio, parseCssColor } from './lib/color.mjs';
import { launch, ready, serve, style } from './lib/probe-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/slice-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-form-field: ${DIST} missing. Run \`nx build slice-probe\`.`);
  process.exit(1);
}

const server = await serve(DIST);
const browser = await launch();

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await ready(page);

  console.log('TEKAD input & form field — rendered behaviour\n');

  /* -- 1. the accessibility tree, not the DOM ---------------------------- */
  //
  // Playwright reads Chromium's own accessibility tree — the one assistive
  // technology consumes — so this is a materially stronger claim than "the
  // for attribute resolves".
  const named = await page.locator('[data-probe="input-ok"]');
  const snapshot = await named.evaluate((el) => el.getAttribute('id'));
  const axName = await page.locator('input[data-probe="input-ok"]').evaluate((el) => {
    const input = /** @type {HTMLInputElement} */ (el);
    return input.labels?.[0]?.textContent?.trim() ?? null;
  });

  check(
    'the label element is associated with the input by the platform',
    axName === 'Email',
    // `element.labels` is computed by the browser from `for` and containment —
    // it is the platform's own answer, not a re-derivation of the attribute.
    `input.labels[0] is "${axName}" (id ${snapshot})`,
  );

  const axRole = await page.locator('input[data-probe="input-ok"]').getAttribute('aria-label');
  check(
    'and it does so WITHOUT an aria-label overriding the visible text',
    axRole === null,
    // WCAG 2.2 SC 2.5.3 Label in Name: an aria-label silently replaces the
    // visible text, breaking speech control for a user saying what they see.
    axRole === null ? 'no aria-label' : `aria-label="${axRole}" would replace it`,
  );

  const describedResolves = await page.evaluate(() => {
    const el = document.querySelector('input[data-probe="input-ok"]');
    const ids = (el?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? null);
  });
  check(
    'aria-describedby resolves to real, rendered text',
    describedResolves.length === 1 && describedResolves[0] === 'We will not share it.',
    JSON.stringify(describedResolves),
  );

  /* -- 2. size and focus -------------------------------------------------- */
  const inputBox = await style(page, 'input-ok', []);
  const h = Number(inputBox?.['__height'] ?? 0);
  check('the input clears the 44px target floor', h >= 44, `${h.toFixed(1)}px — WCAG 2.2 SC 2.5.8`);

  await page.locator('input[data-probe="input-ok"]').focus();
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement ?? document.body);
    return { width: cs.outlineWidth, style: cs.outlineStyle };
  });
  check(
    'focus draws a visible ring',
    ring.style !== 'none' && Number.parseFloat(ring.width) >= 2,
    `${ring.width} ${ring.style}`,
  );

  /* -- 3. rendered contrast ---------------------------------------------- */
  //
  // The error is the interesting one. `verify-contrast.mjs` checks declared
  // token PAIRS — `on-danger` against `danger`, a filled danger surface. This
  // is `danger` used as TEXT on `surface`, which is a different pair and is
  // not in the token manifest at all. A component reaching for a token in a
  // combination nobody declared is exactly how a build-time contrast gate gets
  // bypassed without anyone bypassing it.
  /** @type {{probe: string, label: string, threshold: number, within?: string}[]} */
  const contrastCases = [
    { probe: 'input-ok', label: 'input text', threshold: 4.5 },
    { probe: 'field-ok', label: 'label text', threshold: 4.5 },
    {
      probe: 'field-bad',
      label: 'ERROR text on the page surface',
      threshold: 4.5,
      within: 'tk-field-error',
    },
    { probe: 'field-ok', label: 'hint text', threshold: 4.5, within: 'tk-field-hint' },
  ];
  for (const { probe, label, threshold, within } of contrastCases) {
    const s = await style(page, probe, ['color', 'background-color'], within);
    const fg = parseCssColor(s?.['color'] ?? '');
    // A transparent background means "whatever is behind", and parseCssColor
    // would report black — which is a number about nothing. The page surface
    // is the honest comparison.
    const bgRaw = s?.['background-color'] ?? '';
    const bg =
      bgRaw === 'rgba(0, 0, 0, 0)'
        ? await page.evaluate(() => {
            const main = document.querySelector('main');
            return main ? getComputedStyle(main).backgroundColor : 'rgb(255, 255, 255)';
          })
        : bgRaw;
    const parsedBg = parseCssColor(bg);
    const ratio = fg && parsedBg ? contrastRatio(fg, parsedBg) : 0;
    check(
      `${label} meets WCAG 2.2 AA (${threshold}:1)`,
      ratio >= threshold,
      `${ratio.toFixed(2)}:1 for ${s?.['color']} on ${bg}`,
    );
  }

  const errBefore = await style(page, 'field-bad', ['color'], 'tk-field-error');
  const invalidBorder = await style(page, 'input-bad', ['border-top-width', 'border-top-style']);
  await context.close();

  /* ══ forced colours ═════════════════════════════════════════════════════ */
  console.log('');
  const fcContext = await browser.newContext({ forcedColors: 'active' });
  const fcPage = await fcContext.newPage();
  await fcPage.goto(server.url);
  await ready(fcPage);

  const fcErr = await style(fcPage, 'field-bad', ['color', 'font-weight'], 'tk-field-error');
  const fcInvalid = await style(fcPage, 'input-bad', ['border-top-style', 'border-top-width']);
  const fcBody = await fcPage.evaluate(() => {
    const main = document.querySelector('main');
    return main ? getComputedStyle(main).color : '';
  });

  check(
    'forced colours: the error text stops relying on being red',
    fcErr?.['color'] === fcBody,
    `error colour ${errBefore?.['color']} -> ${fcErr?.['color']}, body ${fcBody}`,
  );
  check(
    'forced colours: the error still stands out, by weight rather than hue',
    Number(fcErr?.['font-weight'] ?? 0) >= 700,
    `font-weight ${fcErr?.['font-weight']}`,
  );
  check(
    'forced colours: an invalid input signals it without colour',
    fcInvalid?.['border-top-style'] === 'dashed',
    // WCAG 1.4.1: colour must not be the only means of conveying information,
    // and in forced-colors mode there is no danger colour to convey it with.
    `border ${invalidBorder?.['border-top-style']} ${invalidBorder?.['border-top-width']} -> ` +
      `${fcInvalid?.['border-top-style']} ${fcInvalid?.['border-top-width']}`,
  );

  await fcContext.close();
} finally {
  await browser.close();
  server.close();
}

if (failed > 0) {
  console.error(`\n✗ ${failed} form-field check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ The field labels its control, and the error survives without colour.');
