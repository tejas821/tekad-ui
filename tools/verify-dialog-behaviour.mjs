#!/usr/bin/env node
/**
 * TEKAD — the dialog, and the question ADR-010 left open.
 *
 * ADR-010 anticipated a bespoke focus trap. Phase 6 narrowed that on reading:
 * "`showModal()` already grants `inert`, `aria-modal`, Escape and focus
 * restore at 96.1%, and non-modal popovers should not trap focus at all — so a
 * bespoke trap is needed ONLY on the `position: fixed` fallback path, and that
 * should be confirmed against a real fallback before building for it."
 *
 * Narrowed on reading is not measured. This measures it: the dialog is opened,
 * Tab is pressed enough times to leave any sane trap, Escape is pressed, and
 * focus is followed the whole way. If the platform delivers, TEKAD writes no
 * focus trap — several hundred lines that must know about `inert`, shadow
 * roots, `tabindex="-1"`, radio groups, `contenteditable`, iframes and
 * sequential focus navigation, and that will be wrong in some of them.
 *
 * It also exercises `@tekad/overlay`'s deferred close, which until this
 * component had no consumer at all. The primitive was proved against a DOM
 * double across 33 assertions; this is the first time it drives a real element
 * in a real top layer.
 *
 * Usage: node tools/verify-dialog-behaviour.mjs
 */
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, ready, serve } from './lib/probe-page.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/apps/slice-probe/browser');

if (!existsSync(DIST)) {
  console.error(`verify-dialog-behaviour: ${DIST} missing. Run \`nx build slice-probe\`.`);
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

/**
 * What has focus, and — the part that matters — whether it is something a user
 * could actually interact with.
 *
 * The distinction is not pedantry. Measured in Chromium, a modal dialog's Tab
 * cycle passes through `document.body` and the `<dialog>` element itself on
 * its way round:
 *
 *   secondary -> close -> body -> dialog -> input -> secondary -> ...
 *
 * `body` is outside the dialog by any DOM test, and it is also not a control:
 * it holds nothing, receives nothing, and the next Tab is back inside. Calling
 * that "focus escaped" would be false. Calling it "focus stayed inside the
 * dialog" would also be false. What is true, and what the decision rests on, is
 * that focus never reaches an INTERACTIVE element outside.
 */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

const focused = (/** @type {import('playwright').Page} */ page) =>
  page.evaluate((sel) => {
    const el = document.activeElement;
    if (!el) return { probe: null, tag: null, insideDialog: false, interactive: false };
    return {
      probe: el.getAttribute('data-probe'),
      tag: el.tagName.toLowerCase(),
      insideDialog: Boolean(el.closest('dialog')),
      interactive: el.matches(sel),
    };
  }, FOCUSABLE);

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await ready(page);

  console.log('TEKAD dialog — the top layer, and what the platform already gives\n');

  /* -- the platform is actually present ---------------------------------- */
  const platform = await page.evaluate(() => {
    const d = document.createElement('dialog');
    return {
      showModal: typeof d.showModal === 'function',
      inert: 'inert' in document.createElement('div'),
    };
  });
  check(
    'CONTROL: this engine has showModal and inert',
    platform.showModal && platform.inert,
    // Without this, every "the platform handled it" result below would also be
    // produced by an engine that had silently done nothing.
    `showModal ${platform.showModal}, inert ${platform.inert}`,
  );

  /* -- open it ------------------------------------------------------------ */
  await page.locator('[data-probe="dialog-trigger"]').focus();
  await page.locator('[data-probe="dialog-trigger"]').click();
  await page.waitForTimeout(120);

  const openState = await page.evaluate(() => {
    const d = document.querySelector('dialog');
    return {
      open: d?.open ?? false,
      // A modal dialog is in the top layer; a non-modal one is not. The
      // :modal pseudo-class is the platform's own answer to which it is.
      modal: d?.matches(':modal') ?? false,
    };
  });
  check('the dialog opens', openState.open, `open=${openState.open}`);
  check(
    'and it is MODAL — showModal(), not show()',
    openState.modal,
    // show() gives an open dialog with no top layer, no inertness and no focus
    // containment. The two are one method call apart and look identical.
    `:modal matches ${openState.modal}`,
  );

  /* -- the background really is inert ------------------------------------- */
  const backgroundReachable = await page.evaluate(() => {
    const outside = /** @type {HTMLElement | null} */ (
      document.querySelector('[data-probe="dialog-trigger"]')
    );
    outside?.focus();
    return document.activeElement === outside;
  });
  check(
    'the background cannot be focused while the dialog is open',
    !backgroundReachable,
    // Not a TEKAD feature: showModal() marks everything else inert. Asserted
    // because the whole decision not to build a focus trap rests on it.
    backgroundReachable
      ? 'the trigger took focus — the background is NOT inert'
      : 'focus() on the trigger was refused',
  );

  /* -- THE question: does Tab stay inside? -------------------------------- */
  //
  // Twelve presses against a dialog with three focusable elements. A trap that
  // only works for one cycle, or that relies on counting, breaks here.
  const visited = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    visited.push(await focused(page));
  }
  const escaped = visited.filter((v) => v.interactive && !v.insideDialog);
  check(
    'ADR-010: Tab never reaches an interactive element outside, across 12 presses',
    escaped.length === 0,
    escaped.length === 0
      ? `cycle: ${[...new Set(visited.map((v) => v.probe ?? v.tag))].join(' -> ')}`
      : `focus reached <${escaped[0]?.tag} data-probe="${escaped[0]?.probe}"> outside the dialog`,
  );
  check(
    'and the background probes are never among them',
    !visited.some((v) => v.probe === 'dialog-trigger' || v.probe === 'input-ok'),
    // Named explicitly: "no interactive element outside" is a claim about a
    // category, and this is the same claim about the specific controls that
    // are sitting right there on the page.
    'the trigger and the page inputs were never focused',
  );

  // Backwards, which is where a hand-rolled trap usually fails first.
  const backwards = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab');
    backwards.push(await focused(page));
  }
  check(
    'and Shift+Tab does not either',
    backwards.every((v) => !v.interactive || v.insideDialog),
    `${backwards.filter((v) => v.interactive && !v.insideDialog).length} escape(s) going backwards`,
  );

  /* -- the deferred close, in a real top layer ---------------------------- */
  //
  // @tekad/overlay's reason for existing: an element leaves the top layer the
  // instant close() is called, so a closing animation plays on something that
  // is no longer on top of anything. The primitive holds it there.
  const closing = await page.evaluate(async () => {
    const d = /** @type {HTMLDialogElement} */ (document.querySelector('dialog'));
    const btn = /** @type {HTMLElement} */ (document.querySelector('[data-probe="dialog-close"]'));
    btn.click();
    // One frame later the exit should be in progress and the element should
    // STILL be open — that is the whole point of deferring.
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    return { hasClosingClass: d.classList.contains('closing'), stillOpen: d.open };
  });
  check(
    'closing defers: the element is still open while the exit plays',
    closing.hasClosingClass && closing.stillOpen,
    `.closing=${closing.hasClosingClass}, open=${closing.stillOpen} — a naive close() would ` +
      'already have removed it from the top layer',
  );

  await page.waitForTimeout(400);
  const afterClose = await page.evaluate(() => {
    const d = /** @type {HTMLDialogElement} */ (document.querySelector('dialog'));
    return {
      open: d.open,
      hasClosingClass: d.classList.contains('closing'),
      focusedProbe: document.activeElement?.getAttribute('data-probe') ?? null,
    };
  });
  check('and it does eventually close', !afterClose.open, `open=${afterClose.open}`);
  check(
    'the closing class is cleaned up, not left on the element',
    !afterClose.hasClosingClass,
    // P0's second-order review found exactly this leak: destroy() left the
    // class on a node that outlived the controller.
    `.closing=${afterClose.hasClosingClass}`,
  );
  check(
    'focus returns to the trigger',
    afterClose.focusedProbe === 'dialog-trigger',
    // Also the platform's, via showModal(). Another few hundred lines TEKAD
    // does not own.
    `focus is on ${afterClose.focusedProbe}`,
  );

  /* -- Escape ------------------------------------------------------------- */
  await page.locator('[data-probe="dialog-trigger"]').click();
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const afterEscape = await page.evaluate(() => {
    const d = /** @type {HTMLDialogElement} */ (document.querySelector('dialog'));
    return {
      open: d.open,
      // The consumer's own state must have been told, or their model still
      // says the dialog is showing and reopening it does nothing.
      modelSaysOpen: document.body.getAttribute('data-dialog-open') === 'true',
    };
  });
  check('Escape closes it, without TEKAD handling a key', !afterEscape.open);
  check(
    'and the consumer’s model is told',
    !afterEscape.modelSaysOpen,
    afterEscape.modelSaysOpen
      ? 'the model still says open — the platform closed it behind the consumer’s back'
      : 'the two-way model reflected the platform close',
  );

  await context.close();
} finally {
  await browser.close();
  server.close();
}

if (failed > 0) {
  console.error(`\n✗ ${failed} dialog check(s) failed.`);
  process.exit(1);
}
console.log(
  '\n✓ The platform supplies the trap, the inertness and the focus restore.\n' +
    '  TEKAD supplies only the exit animation, which is the one part it cannot.',
);
