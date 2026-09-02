#!/usr/bin/env node
/**
 * TEKAD — the checkbox, measured in a real browser.
 *
 * The unit suite covers the DOM contract: the input is native, the label wraps
 * it, `indeterminate` is a property, the model round-trips. None of that
 * touches the thing that makes this component's design defensible.
 *
 * The design is: keep a real `<input type="checkbox">` and paint a box over it.
 * Every argument for that rests on the input STAYING the control — visible to
 * hit-testing, present in the accessibility tree, and handed back to the UA
 * when the user has asked the platform to choose their colours. jsdom cannot
 * see any of it: no layout, no `getComputedStyle` worth the name, no
 * forced-colors emulation.
 *
 * So this checks the three things that would make the design a lie:
 *
 *   1. The input is not hidden. `display: none`, `visibility: hidden`, the
 *      `hidden` attribute and a zero size each remove it from the
 *      accessibility tree — the single most common way a "custom checkbox"
 *      ends up announcing nothing at all. It must have a real box and real
 *      hit-testing.
 *
 *   2. The label is a WCAG 2.2 target. SC 2.5.8 is about the clickable region,
 *      and here that is the label, not the 20px box.
 *
 *   3. Forced colours hands the control back. The painted span is guesswork
 *      about a palette TEKAD cannot see, so it must go, and the input's own
 *      appearance must return. This is the payoff for keeping a real input —
 *      a div wearing a role has nothing to restore.
 *
 * Usage: node tools/verify-checkbox-behaviour.mjs
 */
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, ready, serve, style } from './lib/probe-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/slice-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-checkbox-behaviour: ${DIST} missing. Run \`nx build slice-probe\`.`);
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
  /* ══ normal rendering ═══════════════════════════════════════════════════ */
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await ready(page);

  console.log('TEKAD checkbox — rendered behaviour\n');

  /* -- 1. the input is still the control ---------------------------------- */
  const input = await style(
    page,
    'cb-unchecked',
    ['display', 'visibility', 'opacity', 'pointer-events'],
    'input',
  );

  check(
    'the native input is not display:none',
    input?.['display'] !== 'none',
    `display: ${input?.['display']} — display:none removes it from the accessibility tree`,
  );
  check(
    'the native input is not visibility:hidden',
    input?.['visibility'] !== 'hidden',
    `visibility: ${input?.['visibility']}`,
  );
  check(
    'the native input still has a box',
    Number(input?.['__width'] ?? 0) > 0 && Number(input?.['__height'] ?? 0) > 0,
    `${input?.['__width']}x${input?.['__height']} — a zero-sized input is not hit-testable`,
  );
  check(
    'the native input still receives pointer events',
    input?.['pointer-events'] !== 'none',
    `pointer-events: ${input?.['pointer-events']}`,
  );

  /* -- the decisive one: does a click on the LABEL TEXT toggle it? -------- */
  const labelClick = await page.evaluate(() => {
    const root = document.querySelector('[data-probe="cb-unchecked"]');
    const text = /** @type {HTMLElement} */ (root?.querySelector('.tk-checkbox__text'));
    const box = /** @type {HTMLInputElement} */ (root?.querySelector('input'));
    const before = box.checked;
    text.click();
    return { before, after: box.checked };
  });
  check(
    'clicking the LABEL TEXT toggles the input — the platform, not a handler',
    labelClick.before === false && labelClick.after === true,
    `${labelClick.before} -> ${labelClick.after}`,
  );

  /* -- 2. the target size WCAG 2.2 SC 2.5.8 asks for ---------------------- */
  for (const probe of ['cb-unchecked', 'cb-checked', 'cb-mixed']) {
    const label = await style(page, probe, [], 'label');
    const h = Number(label?.['__height'] ?? 0);
    check(
      `${probe}: the label is at least 44px tall`,
      h >= 44,
      `${h.toFixed(1)}px — the LABEL is the target, not the 20px box`,
    );
  }

  /* -- 3. the painted box actually reflects state ------------------------- */
  const marks = await page.evaluate(() => {
    /** @param {string} p */
    const opacity = (p) => {
      const el = document.querySelector(`[data-probe="${p}"] .tk-checkbox__box`);
      if (!el) return null;
      return getComputedStyle(el, '::before').opacity;
    };
    return {
      checkedMark: opacity('cb-checked'),
      mixedMark: opacity('cb-mixed'),
      // cb-disabled is unchecked, so it doubles as the negative control.
      uncheckedMark: opacity('cb-disabled'),
    };
  });
  check(
    'a checked box paints its mark',
    marks.checkedMark === '1',
    `::before opacity ${marks.checkedMark}`,
  );
  check(
    'a mixed box paints its mark',
    marks.mixedMark === '1',
    `::before opacity ${marks.mixedMark} — indeterminate is a third state, and it must be visible`,
  );
  check(
    'CONTROL: an unchecked box paints nothing',
    marks.uncheckedMark === '0',
    marks.uncheckedMark === '0'
      ? 'so the two above mean something'
      : `::before opacity ${marks.uncheckedMark} — the mark is always on, and the checks above are vacuous`,
  );

  const beforeFc = await style(page, 'cb-unchecked', ['appearance'], 'input');
  await context.close();

  /* ══ forced colours ═════════════════════════════════════════════════════ */
  console.log('');
  const fcContext = await browser.newContext({ forcedColors: 'active' });
  const fcPage = await fcContext.newPage();
  await fcPage.goto(server.url);
  await ready(fcPage);

  const fcInput = await style(fcPage, 'cb-unchecked', ['appearance'], 'input');
  const fcBox = await style(fcPage, 'cb-unchecked', ['display'], '.tk-checkbox__box');
  const fcDisabled = await style(fcPage, 'cb-disabled', ['opacity', 'color'], 'label');

  check(
    "forced colours: the input's own appearance is restored",
    fcInput?.['appearance'] === 'auto',
    `appearance went from ${beforeFc?.['appearance']} to ${fcInput?.['appearance']} — ` +
      'the UA draws checked, mixed, disabled and focus in the user’s colours',
  );
  check(
    'forced colours: the painted box is removed',
    fcBox?.['display'] === 'none',
    `display: ${fcBox?.['display']} — a hand-drawn box would be a worse copy of the UA’s`,
  );
  check(
    'forced colours: a disabled label uses GrayText rather than opacity',
    fcDisabled?.['opacity'] === '1',
    `opacity ${fcDisabled?.['opacity']}, colour ${fcDisabled?.['color']}`,
  );

  await fcContext.close();
} finally {
  await browser.close();
  server.close();
}

if (failed > 0) {
  console.error(`\n✗ ${failed} checkbox check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ The input is still the control, and forced colours gets it back.');
