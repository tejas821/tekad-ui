/**
 * TEKAD P0 — targeted state-machine test: SYNCHRONOUS RE-ENTRY.
 *
 * EVIDENCE CLASS: DEFENSIVE / SIMULATED.
 *
 * Neither Chromium nor WebKitGTK was observed delivering `toggle`
 * synchronously from the close operation, so the browser runs do NOT prove the
 * re-entrancy invariant. This test proves it deterministically at the smallest
 * appropriate seam: the injectable `closeOp` platform boundary. It simulates a
 * synchronous lifecycle callback. It is NOT evidence of browser behaviour, and
 * nothing here may be reported as OBSERVED.
 *
 * Run: node reentrancy.test.mjs
 */
import { DeferredOverlay } from './deferred-overlay.mjs';

/* ------------------------- minimal DOM test double ------------------------ */
class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
  contains(c) { return this.set.has(c); }
}
class FakeElement {
  constructor() {
    this.classList = new FakeClassList();
    this._listeners = new Map();
    this.open = false;
    this.attrs = {};
    this.showPopoverCalls = 0;
    this.hidePopoverCalls = 0;
  }
  addEventListener(t, fn) {
    if (!this._listeners.has(t)) this._listeners.set(t, []);
    this._listeners.get(t).push(fn);
  }
  removeEventListener(t, fn) {
    const a = this._listeners.get(t);
    if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  }
  /** Synchronous dispatch — exactly the hazardous delivery order. */
  dispatchEvent(evt) {
    evt.target = evt.target || this;
    for (const fn of [...(this._listeners.get(evt.type) || [])]) fn(evt);
    return true;
  }
  listenerCount(t) { return (this._listeners.get(t) || []).length; }
  totalListeners() { let n = 0; for (const a of this._listeners.values()) n += a.length; return n; }
  matches() { return this.open; }
  showPopover() { this.showPopoverCalls++; this.open = true; }
  hidePopover() { this.hidePopoverCalls++; this.open = false; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
}

// The controller reads getComputedStyle for the exit duration.
globalThis.getComputedStyle = () => ({
  transitionProperty: 'scale', transitionDuration: '1200ms', transitionDelay: '0s',
});
globalThis.document = { activeElement: null };

/* --------------------------------- runner -------------------------------- */
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

/* =========================================================================
 * TEST — synchronous re-entry through the close operation.
 *
 *   _hardReset()
 *     -> state = 'closed'
 *     -> closeOp()                       (simulated hidePopover)
 *     -> synchronous toggle{newState:'closed'}
 *     -> _onToggle() observes state
 * ========================================================================= */
{
  const el = new FakeElement();
  const trigger = new FakeElement();
  let closeOpCalls = 0;
  const stateSeenByCloseOp = [];

  const ctl = new DeferredOverlay(el, {
    trigger,
    // The seam: a platform close operation that delivers the lifecycle
    // callback SYNCHRONOUSLY, as a browser is permitted to do.
    closeOp: () => {
      closeOpCalls++;
      stateSeenByCloseOp.push(ctl.state);
      el.open = false;
      el.dispatchEvent({ type: 'toggle', oldState: 'open', newState: 'closed' });
    },
  });

  const listenersBefore = el.totalListeners();

  ctl.open();
  ctl.close();                       // begins the deferred exit (1200ms)
  // Force the terminal transition now, exercising the synchronous callback.
  ctl._finish(ctl._token);

  const obs = ctl.reentrantObservations;

  check('state is terminal BEFORE the simulated close operation runs',
    stateSeenByCloseOp.length === 1 && stateSeenByCloseOp[0] === 'closed',
    { stateSeenByCloseOp });

  check('synchronous _onToggle observes state === "closed"',
    obs.length === 1 && obs[0].observedState === 'closed',
    { reentrantObservations: obs });

  check('_resetting guard is held while the nested callback runs',
    obs.length === 1 && obs[0].resettingGuardHeld === true,
    { resettingGuardHeld: obs[0]?.resettingGuardHeld });

  check('no recursive _hardReset performed duplicate cleanup',
    ctl.stats.maxResetDepth === 1,
    { hardResetCalls: ctl.stats.hardResetCalls, maxResetDepth: ctl.stats.maxResetDepth,
      reentrantResetsBlocked: ctl.stats.reentrantResetsBlocked });

  check('no duplicate close recorded',
    ctl.stats.actualCloses === 1 && ctl.stats.actualCloses <= ctl.stats.closeIntents,
    { actualCloses: ctl.stats.actualCloses, closeIntents: ctl.stats.closeIntents,
      browserDismissals: ctl.stats.browserDismissals });

  check('close operation invoked exactly once',
    closeOpCalls === 1, { closeOpCalls });

  check('no duplicate listener registration/removal',
    ctl.stats.listenersAdded === ctl.stats.listenersRemoved
    && el.totalListeners() === listenersBefore,
    { listenersAdded: ctl.stats.listenersAdded, listenersRemoved: ctl.stats.listenersRemoved,
      elementListeners: el.totalListeners(), baseline: listenersBefore });

  check('no stale timer remains', ctl._timer === null,
    { timersScheduled: ctl.stats.timersScheduled, timersCleared: ctl.stats.timersCleared });

  check('no stale transition callback remains', ctl._onEnd === null,
    { onEnd: ctl._onEnd });

  check('final state is "closed"', ctl.state === 'closed', { state: ctl.state });

  check('cleanup balanced (timers and listeners)',
    (ctl.stats.timersScheduled - ctl.stats.timersCleared) <= 0
    && (ctl.stats.listenersAdded - ctl.stats.listenersRemoved) <= 0,
    { timerBalance: ctl.stats.timersScheduled - ctl.stats.timersCleared,
      listenerBalance: ctl.stats.listenersAdded - ctl.stats.listenersRemoved });

  check('no stuck "closing" class or state',
    !el.classList.contains('closing') && ctl.state === 'closed',
    { hasClosingClass: el.classList.contains('closing'), state: ctl.state });
}

/* ===== SECOND-ORDER REVIEW: destroy() must not leak visual exit state ===== */
{
  const el = new FakeElement();
  const ctl = new DeferredOverlay(el, { closeOp: () => { el.open = false; } });
  ctl.open();
  ctl.close();                       // 'closing' class applied, exit armed
  const closingWhileClosing = el.classList.contains('closing');
  ctl.destroy();                     // destroyed mid-exit

  check('destroy() during closing leaves no stale `closing` class on the element',
    closingWhileClosing && !el.classList.contains('closing'),
    { classDuringClose: closingWhileClosing, classAfterDestroy: el.classList.contains('closing') });
  check('destroy() during closing leaves no stuck "closing" state',
    ctl.state === 'closed' && ctl.destroyed === true,
    { state: ctl.state, destroyed: ctl.destroyed });
  check('destroy() during closing leaves no pending timer or listener',
    ctl._timer === null && ctl._onEnd === null && el.totalListeners() === 0,
    { timer: ctl._timer, onEnd: ctl._onEnd, elementListeners: el.totalListeners() });
}

/* -------- CONTROL: the pre-fix ordering must actually be hazardous --------
 * Establishes that the assertions above are meaningful rather than vacuous:
 * with the terminal state assigned AFTER the close operation and no guard, the
 * same synchronous callback re-enters. Reproduced against a local replica of
 * the pre-fix ordering — the production class no longer contains it.
 * ------------------------------------------------------------------------ */
{
  let depth = 0, maxDepth = 0, terminalWrites = 0;
  let state = 'closing';
  const el = new FakeElement();
  let dispatches = 0;

  const preFixHardReset = () => {
    depth++; maxDepth = Math.max(maxDepth, depth);
    try {
      if (depth > 4) return;                    // stack guard for the demo only
      el.classList.remove('closing');
      // pre-fix: close operation runs while state is still non-terminal
      if (dispatches < 3) {
        dispatches++;
        el.dispatchEvent({ type: 'toggle', oldState: 'open', newState: 'closed' });
      }
      state = 'closed'; terminalWrites++;       // terminal state assigned AFTER
    } finally { depth--; }
  };
  el.addEventListener('toggle', (e) => {
    if (e.newState === 'closed' && state !== 'closed') preFixHardReset();
  });
  preFixHardReset();

  check('CONTROL: pre-fix ordering does re-enter (assertions are non-vacuous)',
    maxDepth > 1 && terminalWrites > 1,
    { maxResetDepth: maxDepth, terminalStateWrites: terminalWrites,
      note: 'reproduced against a local replica of the pre-fix ordering; the production class no longer contains it' });
}

/* --------------------------------- report -------------------------------- */
const failed = results.filter(r => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!r.pass) console.log('        ' + JSON.stringify(r.detail));
}
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);

const out = {
  test: 'P0 targeted state-machine test — synchronous re-entry',
  evidenceClass: 'DEFENSIVE / SIMULATED',
  notBrowserEvidence: 'Synchronous toggle delivery was simulated at the injectable closeOp seam. '
    + 'Neither Chromium nor WebKitGTK was observed delivering it synchronously. '
    + 'Nothing here may be reported as OBSERVED browser behaviour.',
  assertions: results.map(r => ({ name: r.name, verdict: r.pass ? 'PASS' : 'FAIL', detail: r.detail })),
  passed: results.length - failed.length,
  total: results.length,
};
const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('./p0-reentrancy-test.json', import.meta.url), JSON.stringify(out, null, 2));
process.exit(failed.length ? 1 : 0);
