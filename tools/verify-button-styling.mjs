#!/usr/bin/env node
/**
 * TEKAD — the button, measured in a real browser.
 *
 * The unit suite in `packages/button` covers what jsdom can host: the type
 * default, identity, the class string. None of that touches a colour, a focus
 * ring, a hit target or a cascade layer, because jsdom has no layout and no
 * style engine worth the name.
 *
 * Everything here needs a browser, and three of the checks are the first
 * evidence for claims the architecture has been resting on since Phase 4:
 *
 *   1. **@layer actually works** (ADR-007 decision 1). The whole promise —
 *      "unlayered consumer rules then win regardless of specificity — no
 *      !important, no ::ng-deep" — has never been tested. It is also the claim
 *      most likely to be quietly broken by tooling: Angular processes
 *      component styles, and if ng-packagr, the bundler or the style injector
 *      dropped or reordered the at-rule, nothing else would notice.
 *
 *   2. **The focus ring survives forced colours** (decision 7). Rendered with
 *      `outline` rather than a box-shadow specifically so it does, which is a
 *      claim about the UA rather than about TEKAD.
 *
 *   3. **The rendered contrast matches the build-time assertion.**
 *      `verify-contrast.mjs` checks token PAIRS in the abstract. This checks
 *      the colours a browser actually computed for a real button, which is a
 *      different thing: a variant that re-points a token to the wrong pair
 *      passes the first check and fails this one.
 *
 * Usage: node tools/verify-button-styling.mjs
 */
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrastRatio, parseCssColor } from './lib/color.mjs';
import { launch, ready, serve, style } from './lib/probe-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/slice-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-button-styling: ${DIST} missing. Run \`nx build slice-probe\`.`);
  process.exit(1);
}

const server = await serve(DIST);
const URL_ = server.url;
const browser = await launch();

let failed = 0;
/** @param {string} name @param {boolean} pass @param {string} [detail] */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

try {
  /* ══ normal rendering ═════════════════════════════════════════════════ */
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL_);
  await ready(page);

  console.log('TEKAD button — rendered behaviour\n');

  /* -- 1. the cascade layer. The claim the whole styling ADR rests on. ---- */
  const filledBg = (await style(page, 'filled', ['background-color']))?.['background-color'];
  const overridden = (await style(page, 'overridden', ['background-color']))?.['background-color'];

  check(
    'CONTROL: a TEKAD button has a TEKAD background at all',
    filledBg !== undefined && filledBg !== 'rgba(0, 0, 0, 0)',
    `filled is ${filledBg}`,
  );
  check(
    'ADR-007 decision 1: an UNLAYERED consumer rule beats the layered TEKAD rule',
    overridden === 'rgb(1, 2, 3)',
    overridden === filledBg
      ? `the override did NOT win — still ${overridden}. @layer is not doing its job, ` +
          'and every consumer needs !important.'
      : `consumer rule won: ${overridden}`,
  );

  /* -- 2. the layer is really a layer, not just a later rule ------------- */
  const layerInfo = await page.evaluate(() => {
    /** @type {string[]} */
    const layers = [];
    let componentRules = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        // The two @layer rule types are not in TypeScript's DOM lib yet, so
        // they are narrowed by constructor name and then read through a cast.
        // Checking the constructor rather than duck-typing the properties
        // matters: a plain CSSStyleRule has neither, and a @media block has
        // `cssRules` but is not a layer.
        const shaped = /** @type {{nameList?: string[], name?: string, cssRules?: CSSRuleList}} */ (
          /** @type {unknown} */ (rule)
        );
        // CSSLayerStatementRule is the `@layer a, b, c;` declaration.
        if (rule.constructor.name === 'CSSLayerStatementRule') {
          layers.push(...(shaped.nameList ?? []));
        }
        if (rule.constructor.name === 'CSSLayerBlockRule' && shaped.name === 'tekad.components') {
          componentRules += shaped.cssRules?.length ?? 0;
        }
      }
    }
    return { layers, componentRules };
  });

  check(
    'the layer ORDER statement survived the build',
    layerInfo.layers.join(',') === 'tekad.reset,tekad.base,tekad.components,tekad.utilities',
    `declared: ${layerInfo.layers.join(' < ') || '(none)'}`,
  );
  check(
    "the button's own styles landed INSIDE @layer tekad.components",
    layerInfo.componentRules > 0,
    `${layerInfo.componentRules} rules in the layer — Angular's style processing preserved the at-rule`,
  );

  /* -- 3. hit target (WCAG 2.2 SC 2.5.8) --------------------------------- */
  for (const probe of ['filled', 'outlined', 'text']) {
    const s = await style(page, probe, []);
    const h = Number(s?.['__height'] ?? 0);
    check(
      `${probe}: hit target is at least 44px tall`,
      h >= 44,
      `${h.toFixed(1)}px — SC 2.5.8 asks 24px at AA and 44px at AAA`,
    );
  }

  /* -- 4. rendered contrast, not token-pair contrast ---------------------- */
  const filled = await style(page, 'filled', ['background-color', 'color']);
  if (filled) {
    const bg = parseCssColor(filled['background-color'] ?? '');
    const fg = parseCssColor(filled['color'] ?? '');
    const ratio = bg && fg ? contrastRatio(fg, bg) : 0;
    check(
      'filled: rendered text meets WCAG 2.2 AA (4.5:1)',
      ratio >= 4.5,
      `${ratio.toFixed(2)}:1 for ${filled['color']} on ${filled['background-color']}`,
    );
  } else {
    check('filled: rendered text meets WCAG 2.2 AA (4.5:1)', false, 'the button was not found');
  }

  /* -- 5. focus ring, and :focus-visible semantics ------------------------ */
  await page.keyboard.press('Tab');
  const focusedRing = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      probe: el.getAttribute('data-probe'),
      width: cs.outlineWidth,
      style: cs.outlineStyle,
      color: cs.outlineColor,
    };
  });
  check(
    'keyboard focus draws a visible ring',
    focusedRing !== null &&
      focusedRing.style !== 'none' &&
      Number.parseFloat(focusedRing.width) >= 2,
    `${focusedRing?.probe}: ${focusedRing?.width} ${focusedRing?.style} ${focusedRing?.color}`,
  );

  const clicked = await page.evaluate(() => {
    const el = /** @type {HTMLElement} */ (document.querySelector('[data-probe="text"]'));
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  // A real pointer press, not el.focus() — :focus-visible is decided by the
  // browser's own heuristic about HOW focus arrived, and a scripted focus()
  // does not exercise it.
  await page.mouse.click(clicked.x, clicked.y);
  const afterMouse = await page.evaluate(() => {
    const el = /** @type {HTMLElement} */ (document.querySelector('[data-probe="text"]'));
    return { outline: getComputedStyle(el).outlineStyle, isFocused: document.activeElement === el };
  });
  check(
    'CONTROL: the mouse click actually focused the button',
    afterMouse.isFocused,
    // Without this, "no ring after a click" would also pass if the click
    // missed the button entirely, which is the easy way for this pair of
    // checks to become vacuous.
    afterMouse.isFocused ? 'it is document.activeElement' : 'the click did not land on it',
  );
  check(
    'a MOUSE click does not leave a focus ring behind',
    afterMouse.outline === 'none',
    afterMouse.outline === 'none'
      ? ':focus-visible is doing the work'
      : `outline-style is ${afterMouse.outline} after a click — :focus was used instead of :focus-visible`,
  );

  await context.close();

  /* ══ forced colours (ADR-007 decision 7) ═══════════════════════════════ */
  console.log('');
  const fcContext = await browser.newContext({ forcedColors: 'active' });
  const fcPage = await fcContext.newPage();
  await fcPage.goto(URL_);
  await ready(fcPage);

  const fcText = await style(fcPage, 'text', ['border-top-color', 'color', 'background-color']);
  const fcDisabled = await style(fcPage, 'disabled', ['color', 'opacity']);
  const fcFilled = await style(fcPage, 'filled', ['background-color', 'color']);

  check(
    'forced colours: the UA has taken over the palette',
    fcFilled?.['background-color'] !== filled?.['background-color'],
    `filled background went from ${filled?.['background-color']} to ${fcFilled?.['background-color']}`,
  );
  check(
    'forced colours: a text button still has a visible boundary',
    fcText?.['border-top-color'] !== undefined && fcText['border-top-color'] !== 'rgba(0, 0, 0, 0)',
    `border is ${fcText?.['border-top-color']} — without it, indistinguishable from body text`,
  );
  check(
    'forced colours: disabled uses GrayText rather than 38% opacity',
    fcDisabled?.['opacity'] === '1',
    `opacity ${fcDisabled?.['opacity']}, colour ${fcDisabled?.['color']} — opacity is not ` +
      'forced-colors-aware and can fall below the contrast the user chose',
  );

  await fcContext.close();
} finally {
  await browser.close();
  server.close();
}

if (failed > 0) {
  console.error(`\n✗ ${failed} button styling check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ The button renders, layers, focuses and survives forced colours.');
