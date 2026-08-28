/**
 * TEKAD candidate overlay primitive — deferred-close state machine.
 *
 * Single source of truth for the P0 lifecycle contract. Imported by the
 * browser harness (`harness4.html`) and by the deterministic state-machine
 * test (`reentrancy.test.mjs`), so the two can never drift.
 *
 * CONTRACT BOUNDARY
 *   popover="manual" -> TEKAD owns dismissal -> the deferred visual exit
 *                       lifecycle is guaranteed.
 *   popover="auto"   -> the browser owns light-dismiss and may remove the
 *                       element from the top layer BEFORE `toggle` is
 *                       delivered, so a deferred exit animation is NOT
 *                       guaranteed; the controller reconciles instead.
 *
 * ACCESSIBILITY
 *   ARIA/focus state is released at close INTENT, not at animation end.
 *   No generic `aria-hidden` rule is applied — role-appropriate semantics
 *   belong to the concrete component. No assistive-technology behaviour is
 *   validated by this primitive or its tests.
 */

export const DEFAULT_EXIT_PROPERTY = 'scale';
export const DEFAULT_SAFETY_MARGIN_MS = 50;

export class DeferredOverlay {
  /**
   * @param el       host element (popover or <dialog>)
   * @param opts.trigger        element carrying aria-expanded
   * @param opts.kind           'popover' | 'dialog'
   * @param opts.closeOp        platform close operation. Injectable so the
   *                            state machine does not hard-depend on a DOM
   *                            method; also collapses the popover/dialog
   *                            branch into one call site.
   * @param opts.exitProperty   transition property that defines the exit
   * @param opts.safetyMarginMs margin added to the measured duration
   */
  constructor(el, {
    trigger = null,
    kind = 'popover',
    closeOp = null,
    exitProperty = DEFAULT_EXIT_PROPERTY,
    safetyMarginMs = DEFAULT_SAFETY_MARGIN_MS,
  } = {}) {
    this.el = el;
    this.trigger = trigger;
    this.kind = kind;
    this.exitProperty = exitProperty;
    this.safetyMarginMs = safetyMarginMs;
    this._closeOp = closeOp || (() => {
      if (kind === 'dialog') el.close(); else el.hidePopover();
    });

    this.state = 'closed';          // closed | open | closing
    this.destroyed = false;
    this._token = 0;                // invalidates stale close completions
    this._timer = null;
    this._onEnd = null;
    this._lastFocus = null;
    this._resetting = false;        // re-entrancy guard
    this._depth = 0;

    this.stats = {
      opens: 0, closeIntents: 0, actualCloses: 0,
      listenersAdded: 0, listenersRemoved: 0,
      timersScheduled: 0, timersCleared: 0,
      staleSuppressed: 0, decoyIgnored: 0, cancelHandled: 0,
      browserDismissals: 0, endEventsHandled: 0,
      reentrantResetsBlocked: 0, toggleEventsSeen: 0,
      hardResetCalls: 0, maxResetDepth: 0,
    };
    this.log = [];
    this.lifecycleEvents = [];
    /** States observed by a nested handler re-entering during a close. */
    this.reentrantObservations = [];

    this._onToggle = (e) => {
      if (this.destroyed) return;
      this.stats.toggleEventsSeen++;
      // Record what a nested/synchronous handler sees. If the terminal state
      // is established before the close operation, this is always 'closed'.
      if (this._depth > 0) {
        this.reentrantObservations.push({
          observedState: this.state,
          duringHardResetDepth: this._depth,
          resettingGuardHeld: this._resetting,
        });
      }
      if (e.newState === 'closed' && this.state !== 'closed') {
        this.lifecycleEvents.push({
          entryPoint: `${e.type} event (newState=closed)`,
          controllerStateAtEntry: this.state,
          exitAnimationWasInFlight: this._onEnd !== null || this._timer !== null,
          handledBy: '_hardReset (reconcile, do not animate)',
        });
        this.stats.browserDismissals++;
        this._log('browser-dismissed');
        this._hardReset();
      }
    };
    el.addEventListener('toggle', this._onToggle);
    if (kind === 'dialog') el.addEventListener('close', this._onToggle);
  }

  _log(m) { this.log.push(`${this.state}:${m}`); }

  /** Exit duration read from computed style — never hard-coded. */
  exitDurationMs() {
    const cs = getComputedStyle(this.el);
    const props = String(cs.transitionProperty || '').split(',').map(s => s.trim());
    const durs = String(cs.transitionDuration || '').split(',').map(s => s.trim());
    const dels = String(cs.transitionDelay || '').split(',').map(s => s.trim());
    const toMs = v => (v || '').endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
    let i = props.indexOf(this.exitProperty);
    if (i === -1) i = props.indexOf('all');
    if (i === -1) return 0;
    const d = toMs(durs[i % durs.length] || '0s') + toMs(dels[i % dels.length] || '0s');
    return Number.isFinite(d) ? d : 0;
  }

  _clearPending() {
    if (this._timer !== null) {
      clearTimeout(this._timer); this._timer = null; this.stats.timersCleared++;
    }
    if (this._onEnd) {
      this.el.removeEventListener('transitionend', this._onEnd);
      this.el.removeEventListener('transitioncancel', this._onEnd);
      this._onEnd = null; this.stats.listenersRemoved++;
    }
  }

  open() {
    if (this.destroyed) return;
    this._token++;                  // any in-flight close is now stale
    this._clearPending();           // pre-emptive cancellation
    this.el.classList.remove('closing');
    this.state = 'open';
    this.stats.opens++;
    this._lastFocus = typeof document !== 'undefined' ? document.activeElement : null;
    if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
    if (this.kind === 'dialog') { if (!this.el.open) this.el.showModal(); }
    else { if (!this.el.matches(':popover-open')) this.el.showPopover(); }
    this._log('opened');
  }

  /** CLOSE INTENT — ARIA and focus are released here, not at animation end. */
  close() {
    if (this.destroyed || this.state === 'closed') return;
    const token = ++this._token;
    this._clearPending();
    this.state = 'closing';
    this.stats.closeIntents++;

    if (this.trigger) this.trigger.setAttribute('aria-expanded', 'false');
    if (this._lastFocus && this._lastFocus.focus) this._lastFocus.focus();
    this._log('close-intent:a11y-released');

    this.el.classList.add('closing');

    const dur = this.exitDurationMs();
    // A ~zero duration fires no transitionend at all.
    if (dur <= 1) { this._log('zero-duration:immediate'); this._finish(token); return; }

    this._onEnd = (e) => {
      if (e.target !== this.el) return;
      if (e.propertyName !== this.exitProperty) { this.stats.decoyIgnored++; return; }
      if (e.type === 'transitioncancel') this.stats.cancelHandled++;
      this.stats.endEventsHandled++;
      this._finish(token);
    };
    this.el.addEventListener('transitionend', this._onEnd);
    this.el.addEventListener('transitioncancel', this._onEnd);
    this.stats.listenersAdded++;

    // Fallback only. Disarmed by a real completion so it can never double-close.
    this._timer = setTimeout(() => { this._log('safety-timeout'); this._finish(token); },
                             dur + this.safetyMarginMs);
    this.stats.timersScheduled++;
  }

  /** Actual DOM / top-layer close. Guarded against stale completions. */
  _finish(token) {
    if (this.destroyed) { this.stats.staleSuppressed++; this._log('suppressed:destroyed'); return; }
    if (token !== this._token) { this.stats.staleSuppressed++; this._log('suppressed:stale'); return; }
    if (this.state !== 'closing') { this.stats.staleSuppressed++; this._log('suppressed:not-closing'); return; }
    this._clearPending();
    this._hardReset();
    this.stats.actualCloses++;
    this._log('closed');
  }

  /**
   * Terminal transition.
   *
   * ORDERING IS LOAD-BEARING: the close operation may deliver `toggle`/`close`
   * synchronously, re-entering this method. The terminal state is therefore
   * established BEFORE the close operation, so a nested handler observes
   * state === 'closed' and returns; `_resetting` additionally prevents nested
   * cleanup from running twice.
   */
  _hardReset() {
    this.stats.hardResetCalls++;
    if (this._resetting) { this.stats.reentrantResetsBlocked++; return; }
    this._resetting = true;
    this._depth++;
    if (this._depth > this.stats.maxResetDepth) this.stats.maxResetDepth = this._depth;
    try {
      this._clearPending();
      this.el.classList.remove('closing');
      this.state = 'closed';          // terminal state BEFORE the close call
      try { this._closeOp(); } catch { /* already closed */ }
    } finally {
      this._depth--;
      this._resetting = false;
    }
  }

  destroy() {
    this.destroyed = true;
    this._token++;
    this._clearPending();
    // Defect fix (second-order review): do not leak visual exit state onto a
    // DOM node that outlives the controller, and do not leave `state` stuck at
    // 'closing'. The element is NOT closed here — unmounting is the caller's
    // concern — only controller-owned decoration is withdrawn.
    this.el.classList.remove('closing');
    this.state = 'closed';
    this.el.removeEventListener('toggle', this._onToggle);
    this.el.removeEventListener('close', this._onToggle);
    this._log('destroyed');
  }
}
