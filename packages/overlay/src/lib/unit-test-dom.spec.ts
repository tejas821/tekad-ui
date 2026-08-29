import { describe, it, expect } from 'vitest';

/**
 * What the unit-test DOM does NOT have — asserted, so that it fails when it
 * changes.
 *
 * `docs/architecture/12-overlay-foundation.md` promised the 33-assertion
 * lifecycle proof would "move into Phase 8's testing infrastructure
 * unchanged". Phase 8 measured the infrastructure before moving anything, and
 * it cannot host that proof.
 *
 * `@nx/angular:unit-test` runs specs under **jsdom**
 * (`navigator.userAgent` ends `jsdom/…`). Measured here, jsdom 2026-08 ships
 * none of the primitives `@tekad/overlay` is built on:
 *
 *   showPopover / popover attribute .... absent  → no top layer at all
 *   dialog.showModal .................. absent  → no modal path
 *   inert ............................. absent  → no background-inertness
 *   element.animate / getAnimations ... absent  → no Web Animations
 *   matchMedia ........................ absent  → no prefers-reduced-motion
 *   TransitionEvent ................... PRESENT → transitionend can be dispatched
 *
 * That last line is the whole reason the driver's `FakeElement` is shaped the
 * way it is. jsdom can carry the *event* that ends a deferred close but none
 * of the *state* that a deferred close exists to manage, so a spec here that
 * used a real element would be a double wearing a real element's name — worse
 * than an honest double, because it would read as browser-backed.
 *
 * So the lifecycle proof stays in `tools/verify-overlay-lifecycle.test.mjs`,
 * and its stated reason is no longer only "the invariant is about ordering in
 * one synchronous stack" — it is also that the unit runner has nothing to
 * offer it. Real-browser obligations (top layer, focus, `inert`,
 * `prefers-reduced-motion`) belong to the Playwright gates, which is where
 * they already are.
 *
 * ── Why this is asserted and not written in a comment ────────────────────
 *
 * Same arrangement as ADR-005's assumptions gate. If a jsdom upgrade lands
 * `showPopover` or `showModal`, this spec fails, and the failure is the news:
 * the double may be retirable and this decision should be revisited. A
 * comment would go stale silently.
 */
describe('the unit-test DOM (jsdom)', () => {
  const el = () => document.createElement('div');

  it('is jsdom, not a browser', () => {
    expect(navigator.userAgent).toMatch(/jsdom/i);
  });

  it('has no top layer — no popover API', () => {
    expect('showPopover' in el()).toBe(false);
    expect('popover' in el()).toBe(false);
  });

  it('has no modal dialog', () => {
    const d = document.createElement('dialog') as HTMLDialogElement;
    expect(typeof d.showModal).not.toBe('function');
  });

  it('has no inert', () => {
    expect('inert' in el()).toBe(false);
  });

  it('has no Web Animations, so a real close cannot be observed ending', () => {
    expect(typeof el().animate).not.toBe('function');
    expect((el() as unknown as { getAnimations?: unknown }).getAnimations).toBeUndefined();
  });

  it('has no matchMedia, so prefers-reduced-motion cannot be honoured here', () => {
    expect(typeof matchMedia).toBe('undefined');
  });

  it('DOES have TransitionEvent — the one piece the driver double relies on', () => {
    expect(typeof TransitionEvent).toBe('function');
  });
});
