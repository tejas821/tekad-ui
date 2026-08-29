#!/usr/bin/env node
/**
 * TEKAD — deterministic lifecycle proof for the deferred-close overlay.
 *
 * EVIDENCE CLASS: DEFENSIVE / SIMULATED.
 *
 * Prototype P0 observed that neither Chromium nor WebKitGTK delivers `toggle`
 * synchronously from the close operation. The browser runs therefore do NOT
 * prove the re-entrancy invariant — nothing here may ever be reported as
 * OBSERVED browser behaviour. What this proves is that the state machine is
 * correct *if* an engine ever does deliver synchronously, which the platform
 * permits.
 *
 * The simulation happens at the smallest appropriate boundary: the injectable
 * `closeOp` seam. P0 explicitly rejected monkey-patching `hidePopover` to force
 * a real browser to dispatch synchronously — forcing an engine to behave in a
 * way it does not is not evidence, it is a different experiment.
 *
 * ── Why this runs against dist/ ──────────────────────────────────────────
 *
 * Against the BUILT package, not the source. A partial-compiled FESM bundle is
 * what a consumer receives; testing the source would leave the build itself
 * unverified, and the build is where things like compilation mode go wrong
 * (see Phase 2).
 *
 * ── Why a DOM double and not a browser ───────────────────────────────────
 *
 * The invariant is about ordering inside one synchronous call stack. A real
 * browser cannot be made to exhibit it, and a headless one would add
 * variability to a test whose entire value is determinism.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/packages/overlay');

if (!existsSync(DIST)) {
  console.error('verify-overlay-lifecycle: dist/packages/overlay missing. Run `nx build overlay`.');
  process.exit(1);
}

/* ------------------------- minimal DOM test double ------------------------ */
class FakeClassList {
  #set = new Set();
  /** @param {string} c */ add(c) {
    this.#set.add(c);
  }
  /** @param {string} c */ remove(c) {
    this.#set.delete(c);
  }
  /** @param {string} c */ contains(c) {
    return this.#set.has(c);
  }
}

class FakeElement {
  constructor() {
    this.classList = new FakeClassList();
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
    this.open = false;
    /** @type {Record<string, string>} */
    this.attrs = {};
    this.hidePopoverCalls = 0;
    this.showPopoverCalls = 0;
  }
  addEventListener(t, fn) {
    if (!this._listeners.has(t)) this._listeners.set(t, []);
    this._listeners.get(t).push(fn);
  }
  removeEventListener(t, fn) {
    const a = this._listeners.get(t);
    if (a) {
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    }
  }
  /** SYNCHRONOUS dispatch — exactly the hazardous delivery order. */
  dispatchEvent(evt) {
    evt.target = evt.target || this;
    for (const fn of [...(this._listeners.get(evt.type) || [])]) fn(evt);
    return true;
  }
  totalListeners() {
    let n = 0;
    for (const a of this._listeners.values()) n += a.length;
    return n;
  }
  matches() {
    return this.open;
  }
  showPopover() {
    this.showPopoverCalls++;
    this.open = true;
  }
  hidePopover() {
    this.hidePopoverCalls++;
    this.open = false;
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  getAttribute(k) {
    return this.attrs[k] ?? null;
  }
}

/* The controller reads computed style for the exit duration. */
let transitionStyle = {
  transitionProperty: 'scale',
  transitionDuration: '1200ms',
  transitionDelay: '0s',
};
globalThis.getComputedStyle = () => transitionStyle;
globalThis.document = { activeElement: null };
globalThis.HTMLElement = FakeElement;

const { TekadDeferredOverlay } = await import(join(DIST, 'fesm2022', 'tekad-overlay.mjs'));

let failed = 0;
/**
 * @param {string} name
 * @param {boolean} pass
 * @param {string} [detail]
 */
function check(name, pass, detail) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
  if (!pass) failed++;
}

/* =========================================================================
 * 1. SYNCHRONOUS RE-ENTRY through the close operation.
 *
 *   #terminal()
 *     -> state = 'closed'          <-- must happen FIRST
 *     -> closeOp()                 (simulated hidePopover)
 *     -> synchronous toggle{newState:'closed'}
 *     -> #onToggle observes state
 * ======================================================================= */
console.log('\n— synchronous re-entry at the closeOp seam —');
{
  const el = new FakeElement();
  const trigger = new FakeElement();
  /** @type {string[]} */
  const stateSeenByCloseOp = [];
  /** @type {any[]} */
  const diagnostics = [];
  let closeOpCalls = 0;

  /** @type {any} */
  let ctl;
  ctl = new TekadDeferredOverlay(el, {
    trigger,
    diagnostics: (d) => diagnostics.push(d),
    closeOp: () => {
      closeOpCalls++;
      stateSeenByCloseOp.push(ctl.state);
      el.open = false;
      el.dispatchEvent({ type: 'toggle', oldState: 'open', newState: 'closed' });
    },
  });

  ctl.open();
  transitionStyle = {
    transitionProperty: 'scale',
    transitionDuration: '0s',
    transitionDelay: '0s',
  };
  ctl.close(); // zero duration -> closes synchronously, all in one stack
  transitionStyle = {
    transitionProperty: 'scale',
    transitionDuration: '1200ms',
    transitionDelay: '0s',
  };

  const reentrant = diagnostics.filter((d) => d.event === 'reentrant-observation');

  check('the close operation ran exactly once', closeOpCalls === 1, `${closeOpCalls}`);
  check(
    'the terminal state was established BEFORE the close call',
    stateSeenByCloseOp.every((s) => s === 'closed'),
    JSON.stringify(stateSeenByCloseOp),
  );
  check(
    'a synchronously re-entering handler observed the terminal state',
    reentrant.length > 0 && reentrant.every((d) => d.detail.observedState === 'closed'),
    `${reentrant.length} observation(s): ${JSON.stringify(reentrant.map((d) => d.detail.observedState))}`,
  );
  check(
    'the re-entrancy guard was held during the nested entry',
    reentrant.every((d) => d.detail.resettingGuardHeld === true),
  );
  check('the controller ended closed', ctl.state === 'closed', ctl.state);
  check('aria-expanded was released', trigger.getAttribute('aria-expanded') === 'false');
  check('the closing class was removed', !el.classList.contains('closing'));
}

/* =========================================================================
 * 2. THE CONTROL. The pre-fix ordering must genuinely re-enter.
 *
 * Without this the test above is vacuous: a state machine that never re-enters
 * at all would also pass every assertion. A local replica with the ORIGINAL
 * ordering — close call before terminal state — must be shown to break.
 * ======================================================================= */
console.log('\n— control: the pre-fix ordering must actually re-enter —');
{
  /*
   * A faithful replica of the ordering P0 found and fixed: the close call
   * happens BEFORE the terminal state is established.
   *
   * Running it uncapped crashes with `RangeError: Maximum call stack size
   * exceeded`. That is not a flaw in the replica — it is the defect's actual
   * consequence. Because the state is never terminal when the nested handler
   * checks it, the guard never engages and the transition re-enters without
   * bound. P0 recorded this as "a synchronous toggle could re-enter cleanup";
   * the failure mode is in fact unbounded recursion, not a single extra pass.
   *
   * The depth cap below exists only so the test can OBSERVE the recursion
   * instead of dying of it.
   */
  const CAP = 8;
  class PreFixOverlay {
    constructor(el, closeOp) {
      this.el = el;
      this.state = 'open';
      this.closeOp = closeOp;
      /** @type {string[]} */
      this.observed = [];
      this.terminalCalls = 0;
      this.hitCap = false;
      el.addEventListener('toggle', (e) => {
        if (e.newState === 'closed' && this.state !== 'closed') {
          this.observed.push(this.state);
          this.terminal();
        }
      });
    }
    terminal() {
      if (this.terminalCalls >= CAP) {
        this.hitCap = true;
        return;
      }
      this.terminalCalls++;
      this.closeOp(); // <-- the defect: close FIRST
      this.state = 'closed'; // <-- terminal state only afterwards
    }
  }

  const el = new FakeElement();
  const ctl = new PreFixOverlay(el, () => {
    el.open = false;
    el.dispatchEvent({ type: 'toggle', oldState: 'open', newState: 'closed' });
  });
  ctl.terminal();

  check(
    'the pre-fix ordering re-enters the terminal transition',
    ctl.terminalCalls > 1,
    `${ctl.terminalCalls} calls`,
  );
  check(
    'and would recurse without bound — it only stopped at the test cap',
    ctl.hitCap === true,
    `cap ${CAP} reached`,
  );
  check(
    'every nested handler observed a NON-terminal state',
    ctl.observed.length > 0 && ctl.observed.every((s) => s !== 'closed'),
    JSON.stringify(ctl.observed.slice(0, 4)) + (ctl.observed.length > 4 ? ' ...' : ''),
  );
}

/* =========================================================================
 * 3. Resource balance and the remaining contract requirements.
 * ======================================================================= */
console.log('\n— resource balance and contract requirements —');
{
  const el = new FakeElement();
  const before = el.totalListeners();
  const ctl = new TekadDeferredOverlay(el, { closeOp: () => {} });
  const afterConstruct = el.totalListeners();

  for (let i = 0; i < 20; i++) {
    ctl.open();
    ctl.close();
  }
  /*
   * MEASURED AT THE RIGHT MOMENT. The loop ends mid-close, and a close in
   * flight legitimately holds two listeners — transitionend and
   * transitioncancel. The first version of this check asserted the baseline
   * here and failed at 3 vs 1: the test was wrong, not the controller.
   *
   * What actually matters is that the count does not GROW with the number of
   * cycles. Twenty closes holding two listeners is correct; twenty closes
   * holding forty is the leak.
   */
  const midClose = el.totalListeners();
  ctl.open(); // pre-emptive cancellation releases the in-flight close
  const afterCancel = el.totalListeners();

  check(
    'constructing adds exactly one listener',
    afterConstruct - before === 1,
    `${afterConstruct - before}`,
  );
  check(
    'a close in flight holds exactly 2 listeners, however many cycles preceded it',
    midClose - afterConstruct === 2,
    `${midClose - afterConstruct} after 20 cycles`,
  );
  check(
    'reopening releases them, returning to the baseline',
    afterCancel === afterConstruct,
    `${afterCancel} vs ${afterConstruct}`,
  );
  ctl.close();

  ctl.destroy();
  check('destroy() removes every listener it added', el.totalListeners() === before);
  check('destroy() leaves the state terminal', ctl.state === 'closed');
  check('destroy() removes the closing class', !el.classList.contains('closing'));

  const stateBefore = ctl.state;
  ctl.open();
  ctl.close();
  check('a destroyed controller ignores open() and close()', ctl.state === stateBefore);
}

/* ---- exit duration parsing: the cases P0 enumerated --------------------- */
console.log('\n— exit duration read from computed style, never hard-coded —');
{
  const el = new FakeElement();
  const ctl = new TekadDeferredOverlay(el, { closeOp: () => {} });
  /**
   * @param {string} name
   * @param {object} style
   * @param {number} expected
   */
  const dur = (name, style, expected) => {
    transitionStyle = style;
    const got = ctl.exitDurationMs();
    check(name, got === expected, `${got}ms`);
  };

  dur(
    'milliseconds',
    { transitionProperty: 'scale', transitionDuration: '300ms', transitionDelay: '0s' },
    300,
  );
  dur(
    'seconds',
    { transitionProperty: 'scale', transitionDuration: '0.4s', transitionDelay: '0s' },
    400,
  );
  dur(
    'delay is included',
    { transitionProperty: 'scale', transitionDuration: '200ms', transitionDelay: '100ms' },
    300,
  );
  dur(
    'the named property is picked out of a multi-property list',
    {
      transitionProperty: 'opacity, scale, filter',
      transitionDuration: '100ms, 500ms, 900ms',
      transitionDelay: '0s, 0s, 0s',
    },
    500,
  );
  dur(
    'a short duration list wraps, as CSS specifies',
    { transitionProperty: 'opacity, scale', transitionDuration: '250ms', transitionDelay: '0s' },
    250,
  );
  dur(
    '`all` is honoured when the property is not named',
    { transitionProperty: 'all', transitionDuration: '600ms', transitionDelay: '0s' },
    600,
  );
  dur(
    'no matching property means zero',
    { transitionProperty: 'opacity', transitionDuration: '600ms', transitionDelay: '0s' },
    0,
  );
  dur(
    'no transition at all means zero',
    { transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' },
    0,
  );
}

/* ---- zero duration closes immediately ---------------------------------- */
console.log('\n— a ~zero duration closes immediately, not on a transitionend that never fires —');
{
  transitionStyle = {
    transitionProperty: 'scale',
    transitionDuration: '0s',
    transitionDelay: '0s',
  };
  const el = new FakeElement();
  let closes = 0;
  const ctl = new TekadDeferredOverlay(el, {
    closeOp: () => {
      closes++;
      el.open = false;
    },
  });
  ctl.open();
  ctl.close();
  check(
    'closed synchronously with no timer',
    ctl.state === 'closed' && closes === 1,
    `${closes} close(s)`,
  );
}

/* ---- a stale completion cannot close a reopened overlay ----------------- */
console.log('\n— a superseded close cannot close a reopened overlay —');
{
  transitionStyle = {
    transitionProperty: 'scale',
    transitionDuration: '1200ms',
    transitionDelay: '0s',
  };
  const el = new FakeElement();
  /** @type {any[]} */
  const diagnostics = [];
  let closes = 0;
  const ctl = new TekadDeferredOverlay(el, {
    diagnostics: (d) => diagnostics.push(d),
    closeOp: () => {
      closes++;
      el.open = false;
    },
  });

  ctl.open();
  ctl.close(); // begins a 1200ms exit
  const onEndDuringClose = el._listeners.get('transitionend')?.[0];
  ctl.open(); // reopen mid-exit: pre-emptive cancellation + token bump

  check('reopening returned the controller to open', ctl.state === 'open', ctl.state);
  check(
    'reopening cancelled the pending transition listener',
    (el._listeners.get('transitionend') ?? []).length === 0,
  );

  // Deliver the stale completion anyway — the listener was removed, so this
  // simulates an event that was already queued when open() ran.
  if (onEndDuringClose) {
    onEndDuringClose({ target: el, type: 'transitionend', propertyName: 'scale' });
  }
  check(
    'a stale completion did not close the reopened overlay',
    ctl.state === 'open' && closes === 0,
    `state=${ctl.state} closes=${closes}`,
  );
}

/* ---- decoy events are filtered by property and target ------------------- */
console.log('\n— transition events filtered by BOTH propertyName and target —');
{
  const el = new FakeElement();
  const child = new FakeElement();
  let closes = 0;
  const ctl = new TekadDeferredOverlay(el, {
    closeOp: () => {
      closes++;
    },
  });
  ctl.open();
  ctl.close();
  const onEnd = el._listeners.get('transitionend')?.[0];

  onEnd({ target: el, type: 'transitionend', propertyName: 'opacity' });
  check('a different property does not close it', ctl.state === 'closing' && closes === 0);

  onEnd({ target: child, type: 'transitionend', propertyName: 'scale' });
  check(
    'the right property on a DESCENDANT does not close it',
    ctl.state === 'closing' && closes === 0,
  );

  onEnd({ target: el, type: 'transitionend', propertyName: 'scale' });
  check(
    'the right property on the right target DOES close it',
    ctl.state === 'closed' && closes === 1,
  );
}

/* ---- browser-driven dismissal is reconciled, not fought ----------------- */
console.log('\n— browser-driven dismissal is reconciled —');
{
  const el = new FakeElement();
  /** @type {any[]} */
  const diagnostics = [];
  const ctl = new TekadDeferredOverlay(el, {
    diagnostics: (d) => diagnostics.push(d),
    closeOp: () => {
      el.open = false;
    },
  });
  ctl.open();
  // A light-dismiss: the browser has ALREADY removed it from the top layer.
  el.open = false;
  el.dispatchEvent({ type: 'toggle', oldState: 'open', newState: 'closed' });

  check('the controller reconciled to closed', ctl.state === 'closed', ctl.state);
  check(
    'and recorded that it did not animate',
    diagnostics.some((d) => d.event === 'browser-dismissed'),
  );
  check('no timer or listener was left pending', el.totalListeners() === 1);
}

if (failed > 0) {
  console.error(`\n${failed} overlay lifecycle check(s) failed.`);
  process.exit(1);
}
console.log('\n✓ The deferred-close state machine holds, and the control proves the');
console.log('  pre-fix ordering genuinely re-enters — so the proof is not vacuous.');
console.log('  EVIDENCE CLASS: DEFENSIVE / SIMULATED. No browser was observed delivering');
console.log('  `toggle` synchronously, and none is claimed to.');
