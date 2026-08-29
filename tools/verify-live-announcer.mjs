#!/usr/bin/env node
/**
 * TEKAD — behavioural verification of the live announcer, in a real browser.
 *
 * ADR-005: "Keyboard, focus-restoration and ARIA state-transition tests remain
 * per-component acceptance criteria." And CLAUDE.md's Definition of Done is
 * explicit that accessibility is "verified behaviourally (not by
 * attribute-counting)".
 *
 * Every claim below is about what assistive technology can perceive, and not
 * one of them can be established by reading the source:
 *
 *   - a region that is `display:none` is removed from the accessibility tree
 *     and announces NOTHING, which is the single most common way a live region
 *     silently fails. Only a real layout can tell you whether it is still
 *     rendered;
 *   - announcing the same string twice must still announce, because a live
 *     region only fires on a CHANGE;
 *   - the region must not exist before the first announcement, or an
 *     application that never announces pays for it — and, on a server render,
 *     would hydrate against a node that was never emitted.
 *
 * ── What this does NOT prove ──────────────────────────────────────────────
 *
 * That a screen reader actually speaks. Nothing short of NVDA, JAWS or
 * VoiceOver proves that, and no screen reader has been run at any point in this
 * project. What is verified here is that the DOM contract those tools rely on
 * is correct. That distinction is deliberate and is recorded, not blurred —
 * the same discipline P0 applied to Firefox.
 *
 * ── Why this is a stopgap ─────────────────────────────────────────────────
 *
 * ADR-011 chose Vitest, and Phase 8 builds the testing infrastructure. Until
 * then this is a purpose-built driver rather than a test suite. It moves into
 * the real harness when there is one; the assertions do not change.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/a11y-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-live-announcer: ${DIST} missing. Run \`nx build a11y-probe\` first.`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
};
const server = createServer((req, res) => {
  const name = (req.url ?? '/').split('?')[0]?.replace(/^\//, '') || 'index.html';
  let file = join(DIST, name);
  if (!existsSync(file)) file = join(DIST, 'index.html');
  try {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const address = server.address();
const URL_ = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/`;

const executablePath =
  process.env['TEKAD_CHROMIUM'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
const page = await browser.newPage();

let failed = 0;
/**
 * @param {string} name
 * @param {unknown} actual
 * @param {unknown} expected
 */
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    `${ok ? '✓' : '✗'} ${name}` +
      (ok ? '' : `\n      got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`),
  );
  if (!ok) failed++;
}

await page.goto(URL_);
await page.waitForFunction(() => window.TEKAD_A11Y_READY === true, null, { timeout: 30000 });

/* -- 1. nothing exists until something is announced ------------------------ */
eq(
  'no live region exists before the first announcement',
  await page.evaluate(() => document.querySelectorAll('[aria-live]').length),
  0,
);

/* -- 2. announcing creates exactly one region per politeness --------------- */
await page.evaluate(() => window.tekadAnnouncer?.announce('three results'));
await page.waitForTimeout(60);

eq(
  'announcing creates exactly two regions, one per politeness',
  await page.evaluate(() => document.querySelectorAll('[aria-live]').length),
  2,
);
eq(
  'the polite region carries role=status and aria-atomic',
  await page.evaluate(() => {
    const el = document.querySelector('[aria-live="polite"]');
    return { role: el?.getAttribute('role'), atomic: el?.getAttribute('aria-atomic') };
  }),
  { role: 'status', atomic: 'true' },
);
eq(
  'the assertive region carries role=alert',
  await page.evaluate(() =>
    document.querySelector('[aria-live="assertive"]')?.getAttribute('role'),
  ),
  'alert',
);
eq(
  'the message reached the polite region',
  await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent),
  'three results',
);

/* -- 3. THE critical one: still in the accessibility tree ------------------ */
const visibility = await page.evaluate(() => {
  const el = /** @type {HTMLElement} */ (document.querySelector('[aria-live="polite"]'));
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    display: cs.display,
    visibility: cs.visibility,
    hidden: el.hasAttribute('hidden'),
    ariaHidden: el.getAttribute('aria-hidden'),
    rendered: rect.width > 0 && rect.height > 0,
  };
});
console.log(`    computed: display=${visibility.display} visibility=${visibility.visibility}`);
eq('the region is NOT display:none (that would silence it)', visibility.display !== 'none', true);
eq('the region is NOT visibility:hidden', visibility.visibility !== 'hidden', true);
eq('the region does NOT use the hidden attribute', visibility.hidden, false);
eq('the region is NOT aria-hidden', visibility.ariaHidden, null);
eq('the region still occupies layout, so it stays in the a11y tree', visibility.rendered, true);

/* -- 4. the same message twice must still announce ------------------------- */
/*
 * A live region fires on a CHANGE. Setting identical text is not a change, so a
 * naive implementation announces "3 results", then filters, then announces
 * "3 results" again — and the user hears nothing the second time. The clear-
 * then-set is observed here as an actual empty intermediate state.
 */
await page.evaluate(() => {
  window.__tekadSaw = [];
  const el = document.querySelector('[aria-live="polite"]');
  const obs = new MutationObserver(() => window.__tekadSaw.push(el?.textContent ?? ''));
  obs.observe(el, { childList: true, characterData: true, subtree: true });
});
await page.evaluate(() => window.tekadAnnouncer?.announce('three results'));
await page.waitForTimeout(80);
const seen = await page.evaluate(() => window.__tekadSaw);
console.log(`    observed content sequence: ${JSON.stringify(seen)}`);
eq('re-announcing the same text produces an observable change', seen.includes(''), true);
eq(
  'and ends with the message present',
  await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent),
  'three results',
);

/* -- 5. empty and whitespace messages are ignored -------------------------- */
await page.evaluate(() => {
  window.tekadAnnouncer?.clear();
  window.tekadAnnouncer?.announce('   ');
});
await page.waitForTimeout(60);
eq(
  'a whitespace-only message announces nothing',
  await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent),
  '',
);

/* -- 6. teardown removes the regions --------------------------------------- */
await page.evaluate(() => window.tekadDestroy?.());
await page.waitForTimeout(60);
eq(
  'destroying the injector removes both regions',
  await page.evaluate(() => document.querySelectorAll('[aria-live]').length),
  0,
);

await browser.close();
server.close();

if (failed > 0) {
  console.error(`\n${failed} live-announcer check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ The live region contract holds in a real browser.');
console.log('  NOT verified: that a screen reader speaks. No screen reader has been run at');
console.log('  any point in this project — that remains tracked, and is not claimed here.');
