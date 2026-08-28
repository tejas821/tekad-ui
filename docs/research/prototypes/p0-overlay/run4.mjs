/**
 * TEKAD P0 — HARDENING PASS.
 *
 * This does NOT re-test browser top-layer behaviour (already established by
 * run3.mjs). It stress-tests the CANDIDATE TEKAD OVERLAY PRIMITIVE
 * (DeferredOverlay in harness4.html) against production lifecycle hazards.
 *
 * Verdicts: PASS | FAIL | UNVERIFIED | NOT APPLICABLE
 *
 * Engine scope: Chromium and WebKitGTK are executed. WebKitGTK is WebKit
 * evidence only - it does NOT certify Safari. Firefox/Gecko is NOT executed
 * anywhere in this file and remains UNVERIFIED; no Gecko behaviour is inferred
 * from WebKit. No screen-reader behaviour is tested.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createServer } from 'node:http';
import { readFileSync as readFile } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
/* ES-module imports are blocked over file:// (CORS), and the harness imports
   deferred-overlay.mjs so the browser and the state-machine test share ONE
   implementation. Serve the directory over http instead. */
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0].replace(/^\//, '') || 'harness4.html';
  try {
    const body = readFile(join(HERE, name));
    const ext = name.slice(name.lastIndexOf('.'));
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const URL_ = `http://127.0.0.1:${PORT}/harness4.html`;
mkdirSync(join(HERE, 'shots'), { recursive: true });

const OVERLAY_RGB = [43, 108, 246], CLOSING_RGB = [47, 116, 255], COVER_RGB = [10, 61, 31];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function centrePixel(buf) {
  const png = PNG.sync.read(buf);
  const i = (png.width * (png.height >> 1) + (png.width >> 1)) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}
// visible = the overlay (either resting or mid-close tint) is painting on top
const visible = rgb => Math.min(dist(rgb, OVERLAY_RGB), dist(rgb, CLOSING_RGB)) < dist(rgb, COVER_RGB);

async function snap(drv) { return JSON.parse(await drv.exec('JSON.stringify(window.H.snapshot())')); }
async function px(drv) { return centrePixel(await drv.shot()); }

/* ------------------------------ the cases ------------------------------ */
async function cases(drv) {
  const out = {};
  const ONLY = process.env.CASE;                 // run a single case by number
  const want = n => !ONLY || ONLY === String(n);
  const R = (id, title, verdict, detail) => { out[id] = { title, verdict, ...detail }; };

  /* 1. Re-open during exit */
  if (want(1)) {
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(200);
    await drv.exec(`window.H.close()`); await sleep(300);          // mid-exit
    const during = await snap(drv);
    await drv.exec(`window.H.open()`);                              // re-open
    await sleep(150);
    const afterReopen = await snap(drv);
    const pixMid = visible(await px(drv));
    await sleep(1600);                                              // past the original exit window
    const later = await snap(drv);
    const pixLater = visible(await px(drv));
    // Pre-emptive cancellation in open() means no stale callback survives to be
    // suppressed — that is stronger than suppressing one. Assert the OUTCOME
    // (no stale close completed, nothing pending) and separately prove the
    // token guard as an independent second line of defence.
    // Leg 2: a SUBSEQUENT close must work normally, proving the cancelled
    // close left no stale timer, listener or state behind.
    await drv.exec(`window.H.close()`);
    await sleep(1500);
    const afterSecondClose = await snap(drv);
    const pixAfterSecondClose = visible(await px(drv));
    const balanced = (afterSecondClose.stats.listenersAdded - afterSecondClose.stats.listenersRemoved) <= 0
      && (afterSecondClose.stats.timersScheduled - afterSecondClose.stats.timersCleared) <= 0;

    // Leg 3: token guard proven independently.
    const guard = JSON.parse(await drv.exec(`window.H.proveStaleGuard()`));
    await drv.exec(`window.H.reset()`);
    const ok = during.state === 'closing' && afterReopen.state === 'open'
      && later.state === 'open' && later.isOpenAttr && pixLater && pixMid
      && later.stats.actualCloses === 0
      && !later.hasClosingClass && !later.pendingTimer && !later.pendingListener
      && afterSecondClose.state === 'closed' && !pixAfterSecondClose
      && afterSecondClose.stats.actualCloses === 1
      && balanced && guard.guardHeld;
    R('case1_reopen_during_exit', 'Re-open during exit', ok ? 'PASS' : 'FAIL',
      { stateDuringExit: during.state, stateAfterReopen: afterReopen.state, stateLater: later.state,
        actualCloses: later.stats.actualCloses,
        stillOpenBeyondOriginalExitDuration: later.state === 'open' && later.isOpenAttr && pixLater,
        subsequentCloseWorked: afterSecondClose.state === 'closed' && !pixAfterSecondClose,
        exactlyOneRealCloseOccurred: afterSecondClose.stats.actualCloses === 1,
        listenerTimerBalanced: balanced,
        pendingWorkCancelledPreemptively: !later.pendingTimer && !later.pendingListener,
        staleTokenGuardProven: guard.guardHeld, staleGuardDetail: guard,
        classification: { implementationInvariantProven: [
            'reopen cancels the in-flight close: overlay still open and painting on top beyond the original exit duration',
            'subsequent close completes normally: no stale timer/listener/state left behind',
            'exactly one real close occurred across the whole sequence',
            'stale-token guard rejects a hand-fired stale completion'],
          browserBehaviourObserved: [], assumptions: [],
          unverified: ['Firefox/Gecko'] },
        pendingTimer: later.pendingTimer, pendingListener: later.pendingListener,
        log: later.log });
  }

  /* 2. Rapid open/close cycling */
  if (want(2)) {
    await drv.exec(`window.H.reset()`);
    for (let i = 0; i < 6; i++) {
      await drv.exec(`window.H.open()`); await sleep(40);
      await drv.exec(`window.H.close()`); await sleep(40);
    }
    await drv.exec(`window.H.open()`); await sleep(60);
    await drv.exec(`window.H.close()`);
    await sleep(2000);
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    const leaked = (s.stats.listenersAdded - s.stats.listenersRemoved);
    const timerLeak = (s.stats.timersScheduled - s.stats.timersCleared);
    const ok = s.state === 'closed' && pixGone && !s.hasClosingClass
      && !s.pendingTimer && !s.pendingListener && leaked <= 0 && timerLeak <= 0;
    R('case2_rapid_cycling', 'Rapid open→close cycling (7 cycles)', ok ? 'PASS' : 'FAIL',
      { finalState: s.state, visuallyGone: pixGone, stuckClosingClass: s.hasClosingClass,
        listenerBalance: leaked, timerBalance: timerLeak, stats: s.stats, log: s.log });
  }

  /* 3. Interrupted / cancelled transition */
  if (want(3)) {
    const caps = JSON.parse(await drv.exec('JSON.stringify(window.H.capabilities())'));
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(200);
    await drv.exec(`window.H.close()`); await sleep(250);
    await drv.exec(`window.H.open()`);                  // interrupts the scale transition
    await sleep(200);
    await drv.exec(`window.H.close()`);                 // close again cleanly
    await sleep(2000);
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    const ok = s.state === 'closed' && pixGone && !s.pendingTimer && !s.pendingListener;
    R('case3_interrupted_transition', 'Interrupted / cancelled transition', ok ? 'PASS' : 'FAIL',
      { transitioncancelSupported: caps.transitioncancel, cancelEventsHandled: s.stats.cancelHandled,
        finalState: s.state, cleanedUp: !s.pendingTimer && !s.pendingListener,
        note: caps.transitioncancel ? 'engine exposes transitioncancel'
          : 'engine does not expose transitioncancel; safety timeout is the cleanup path',
        log: s.log });
  }

  /* 4. Zero duration */
  if (want(4)) {
    await drv.exec(`window.H.reset({durClass:'dur-zero'})`);
    await drv.exec(`window.H.open()`); await sleep(150);
    await drv.exec(`window.H.close()`);
    await sleep(250);                                    // far less than any animation
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    const ok = s.state === 'closed' && pixGone && s.exitDurationMs <= 1 && s.stats.actualCloses === 1;
    R('case4_zero_duration', 'Zero transition duration', ok ? 'PASS' : 'FAIL',
      { measuredExitDurationMs: s.exitDurationMs, finalState: s.state, visuallyGone: pixGone,
        closedWithoutWaitingForEvent: s.log.some(l => l.includes('zero-duration')), log: s.log });
  }

  /* 5. CSS duration mismatch — consumer overrides the duration */
  if (want(5)) {
    await drv.exec(`window.H.reset({durClass:'dur-short'})`);   // consumer CSS: 60ms
    await drv.exec(`window.H.open()`); await sleep(150);
    const s0 = await snap(drv);
    await drv.exec(`window.H.close()`);
    await sleep(400);                                            // 60ms + margin, well under the 1200ms default
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    const ok = s0.exitDurationMs === 60 && s.state === 'closed' && pixGone;
    R('case5_duration_mismatch', 'Consumer CSS duration override (no hard-coded duration)',
      ok ? 'PASS' : 'FAIL',
      { durationReadFromComputedStyleMs: s0.exitDurationMs,
        closedWithinConsumerDuration: pixGone, finalState: s.state, log: s.log });
  }

  /* 6. Destroy / unmount during closing */
  if (want(6)) {
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(200);
    await drv.exec(`window.H.close()`); await sleep(200);   // mid-exit
    await drv.exec(`window.H.destroy()`);
    const justAfter = await snap(drv);
    await sleep(1800);                                     // past the original safety timeout
    const s = await snap(drv);
    const ok = justAfter.destroyed && !s.pendingTimer && !s.pendingListener
      && s.stats.actualCloses === 0;
    R('case6_destroy_during_closing', 'Destroy during closing', ok ? 'PASS' : 'FAIL',
      { destroyed: s.destroyed, pendingTimer: s.pendingTimer, pendingListener: s.pendingListener,
        actualClosesAfterDestroy: s.stats.actualCloses, staleSuppressed: s.stats.staleSuppressed,
        log: s.log });
  }

  /* 7. Multiple transition properties — must not finish on the decoy */
  if (want(7)) {
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(200);
    await drv.exec(`window.H.close()`);
    await sleep(300);   // decoy (background-color, 80ms) has ended; scale (1200ms) has not
    const mid = await snap(drv);
    const pixMid = visible(await px(drv));
    await sleep(1500);
    const end = await snap(drv);
    const ok = mid.state === 'closing' && pixMid && end.state === 'closed';
    R('case7_multiple_transition_properties', 'Multiple transition properties (decoy present)',
      ok ? 'PASS' : 'FAIL',
      { stillClosingAfterDecoyEnded: mid.state === 'closing', stillVisibleAfterDecoy: pixMid,
        decoyEventsIgnored: end.stats.decoyIgnored, finalState: end.state, log: end.log });
  }

  /* 8. prefers-reduced-motion */
  if (want(8)) {
    let verdict = 'UNVERIFIED', detail = {};
    if (drv.setReducedMotion) {
      await drv.setReducedMotion(true);
      await drv.exec(`window.H.reset()`);
      const caps = JSON.parse(await drv.exec('JSON.stringify(window.H.capabilities())'));
      await drv.exec(`window.H.open()`); await sleep(150);
      await drv.exec(`window.H.close()`); await sleep(250);
      const s = await snap(drv);
      const pixGone = !visible(await px(drv));
      const ok = caps.prefersReducedMotion && s.state === 'closed' && pixGone
        && s.exitDurationMs <= 1 && s.triggerAriaExpanded === 'false';
      verdict = ok ? 'PASS' : 'FAIL';
      detail = { mediaQueryMatched: caps.prefersReducedMotion, measuredExitDurationMs: s.exitDurationMs,
                 finalState: s.state, visuallyGone: pixGone, ariaExpanded: s.triggerAriaExpanded, log: s.log };
      await drv.setReducedMotion(false);
    } else {
      detail = { reason: 'this driver cannot emulate prefers-reduced-motion; CSS path is exercised by case 4' };
    }
    R('case8_prefers_reduced_motion', 'prefers-reduced-motion', verdict, detail);
  }

  /* 9. popover=auto light dismiss */
  if (want(9)) {
    await drv.exec(`window.H.reset({popoverMode:'auto'})`);
    await drv.exec(`window.H.open()`); await sleep(250);
    const before = await snap(drv);
    if (drv.clickAt) await drv.clickAt(760, 90);   // real pointer event, clear of overlay+trigger
    else await drv.exec(`window.H.lightDismiss()`);
    await sleep(400);
    const after = await snap(drv);
    const pixGone = !visible(await px(drv));
    const reconciled = after.state === 'closed' && !after.pendingTimer && !after.pendingListener;
    const dismissed = after.stats.browserDismissals >= 1 || !after.isOpenAttr;
    R('case9b_deferred_exit_under_auto_light_dismiss',
      'Deferred exit animation under popover="auto" light dismiss',
      'NOT APPLICABLE',
      { reason: 'The browser removes the auto popover from the top layer BEFORE the toggle event '
              + 'reaches the controller, so there is no window in which a TEKAD-owned exit animation '
              + 'could run. This is a property of browser-owned light-dismiss, not a defect.',
        doNotInterpretAs: 'Case 9 PASS does NOT mean popover="auto" supports a deferred exit animation.',
        contract: 'popover="manual" -> TEKAD owns dismissal -> deferred visual exit lifecycle is guaranteed. '
                + 'popover="auto" -> browser owns light-dismiss -> TEKAD reconciles the already-closed state; '
                + 'a deferred exit animation is NOT promised.',
        classification: { implementationInvariantProven: [], browserBehaviourObserved: [
            'element leaves the top layer before the toggle event is delivered'],
          assumptions: [], unverified: ['Firefox/Gecko', 'real Safari'] } });

    R('case9_popover_auto_light_dismiss', 'Browser-driven light-dismiss reconciliation (popover="auto")',
      (dismissed && reconciled) ? 'PASS' : (dismissed ? 'FAIL' : 'UNVERIFIED'),
      { realPointerEventUsed: !!drv.clickAt,
        lifecycleEntry: after.lifecycleEvents,
        classification: {
          implementationInvariantProven: ['controller reconciles browser-driven dismissal without leaking timers or listeners'],
          browserBehaviourObserved: ['a real pointer click outside an auto popover removes it from the top layer immediately; the deferred exit animation cannot run'],
          assumptions: [],
          unverified: ['Firefox/Gecko', 'real Safari', 'Escape-key light dismiss'] },
        openedBefore: before.isOpenAttr, browserDismissals: after.stats.browserDismissals,
        stateAfter: after.state, visuallyGone: pixGone, stateReconciled: reconciled,
        finding: 'browser-driven dismissal removes the element from the top layer immediately; '
               + 'the exit animation CANNOT run. The controller must reconcile, not animate.',
        log: after.log });
  }

  /* 10. Focus & accessibility lifecycle ordering */
  if (want(10)) {
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(200);
    const opened = await snap(drv);
    await drv.exec(`window.H.close()`);
    await sleep(120);                                    // still mid-exit
    const midExit = await snap(drv);
    const pixMid = visible(await px(drv));
    await sleep(1600);
    const closed = await snap(drv);
    const ok = opened.triggerAriaExpanded === 'true'
      && midExit.triggerAriaExpanded === 'false'         // (a) intent: a11y released immediately
      && midExit.activeElementId === 'trigger'           // (d) focus restored at intent
      && midExit.state === 'closing' && pixMid           // (b) visual exit still running
      && closed.state === 'closed';                      // (c) DOM/top-layer close later
    R('case10_focus_a11y_lifecycle', 'Focus / a11y lifecycle separated from visual exit',
      ok ? 'PASS' : 'FAIL',
      { a_closeIntent_ariaExpanded: midExit.triggerAriaExpanded,
        d_focusRestoredAtIntent: midExit.activeElementId,
        b_visualExitStillRunning: midExit.state === 'closing' && pixMid,
        c_domClosedLater: closed.state === 'closed',
        screenReaderBehaviour: 'UNVERIFIED — not tested by this prototype',
        log: closed.log });
  }

  /* 11. Resource / lifecycle leak audit across a long mixed sequence */
  if (want(11)) {
    await drv.exec(`window.H.reset()`);
    // mixed abuse: opens, mid-exit reopens, full closes, zero-duration closes
    for (let i = 0; i < 4; i++) {
      await drv.exec(`window.H.open()`);  await sleep(60);
      await drv.exec(`window.H.close()`); await sleep(80);
      await drv.exec(`window.H.open()`);  await sleep(50);   // reopen mid-exit
      await drv.exec(`window.H.close()`); await sleep(1400); // let it finish
    }
    // duplicate-listener probe: one synthetic exit-property end while closing
    await drv.exec(`window.H.open()`); await sleep(120);
    await drv.exec(`window.H.close()`); await sleep(80);
    const probe = JSON.parse(await drv.exec(`window.H.dispatchOneExitEnd()`));
    await sleep(1500);
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    const listenerBalance = s.stats.listenersAdded - s.stats.listenersRemoved;
    const timerBalance = s.stats.timersScheduled - s.stats.timersCleared;
    const ok = s.state === 'closed' && pixGone
      && listenerBalance <= 0 && timerBalance <= 0
      && !s.pendingTimer && !s.pendingListener && !s.hasClosingClass
      && s.stats.actualCloses <= s.stats.closeIntents
      && probe.handledDelta === 1;
    R('case11_leak_audit', 'Resource / lifecycle leak audit (long mixed sequence)',
      ok ? 'PASS' : 'FAIL',
      { duplicateEventListeners: probe.handledDelta === 1
          ? 'none — one synthetic exit event handled exactly once'
          : `SUSPECTED — one event handled ${probe.handledDelta} times`,
        listenerBalance, timerBalance,
        staleTimers: s.pendingTimer, staleTransitionCallbacks: s.pendingListener,
        stuckClosingState: s.hasClosingClass || s.state === 'closing',
        closeAfterReopenRaces: `${s.stats.actualCloses} real closes for ${s.stats.closeIntents} intents (must not exceed)`,
        finalState: s.state, visuallyGone: pixGone, stats: s.stats,
        classification: {
          implementationInvariantProven: ['no duplicate listeners', 'no stale timers',
            'no stale transition callbacks', 'no stuck closing state',
            'no close-after-reopen race produced a spurious close'],
          browserBehaviourObserved: [], assumptions: [],
          unverified: ['Firefox/Gecko'] } });
  }

  /* 12. `toggle` reconciliation re-entrancy */
  if (want(12)) {
    await drv.exec(`window.H.reset({popoverMode:'auto'})`);
    const immediate = JSON.parse(await drv.exec(`window.H.closeThenExternallyDismiss()`));
    await sleep(1500);
    const s = await snap(drv);
    const pixGone = !visible(await px(drv));
    // Exactly one terminal transition; no recursive cleanup; no double-count.
    const ok = s.state === 'closed' && pixGone
      && !s.pendingTimer && !s.pendingListener && !s.hasClosingClass
      && s.stats.actualCloses <= s.stats.closeIntents
      && (s.stats.listenersAdded - s.stats.listenersRemoved) <= 0
      && (s.stats.timersScheduled - s.stats.timersCleared) <= 0;
    R('case12_toggle_reentrancy', '`toggle` reconciliation re-entrancy (external close mid-exit)',
      ok ? 'PASS' : 'FAIL',
      { stateImmediatelyAfterExternalClose: immediate.state,
        toggleEventsSeen: s.stats.toggleEventsSeen,
        reentrantResetsBlocked: s.stats.reentrantResetsBlocked,
        recursiveCleanupOccurred: s.stats.reentrantResetsBlocked > 0 ? 'blocked by guard' : 'none attempted',
        closeAccounting: `${s.stats.actualCloses} real closes / ${s.stats.closeIntents} intents`,
        listenerBalance: s.stats.listenersAdded - s.stats.listenersRemoved,
        timerBalance: s.stats.timersScheduled - s.stats.timersCleared,
        finalState: s.state, stuckClosing: s.hasClosingClass,
        classification: { implementationInvariantProven: [
            'terminal state is entered before the DOM close call, so a synchronous toggle sees state=closed',
            'a re-entrancy guard prevents recursive cleanup',
            'no duplicate state transition or double-close accounting'],
          browserBehaviourObserved: ['toggle/close notification timing relative to hidePopover()'],
          assumptions: [], unverified: ['Firefox/Gecko'] } });
  }

  /* 13. Safety-timeout semantics + duration parsing across CSS shapes */
  if (want(13)) {
    await drv.exec(`window.H.reset()`);
    const expect = [
      ['',              1200, 'default (scale 1200ms)'],
      ['cfg-all',        300, 'transition: all 300ms'],
      ['cfg-delay',      300, 'scale 200ms + 100ms delay'],
      ['cfg-seconds',    500, 'scale 0.5s (second units)'],
      ['cfg-noexitprop',   0, 'exit property absent -> 0 -> close immediately'],
      ['cfg-mismatch',   150, '3 properties, 1 duration (list-length mismatch)'],
      ['cfg-multi',      250, 'multi-property list, scale is 2nd entry'],
      ['dur-zero',         0, 'zero duration'],
    ];
    const parsed = [];
    for (const [cls, want, label] of expect) {
      const got = await drv.exec(`window.H.measureDuration(${JSON.stringify(cls)})`);
      parsed.push({ config: label, cssClass: cls || '(default)', expectedMs: want, actualMs: got, ok: got === want });
    }
    // No double close: a real transitionend completion must disarm the safety timer.
    await drv.exec(`window.H.reset()`);
    await drv.exec(`window.H.open()`); await sleep(150);
    await drv.exec(`window.H.close()`);
    await sleep(1400);                        // real transitionend has fired
    const afterEnd = await snap(drv);
    await sleep(600);                         // past where the safety timeout would have fired
    const afterSafetyWindow = await snap(drv);
    const noDoubleClose = afterEnd.stats.actualCloses === 1
      && afterSafetyWindow.stats.actualCloses === 1
      && !afterSafetyWindow.pendingTimer;
    const ok = parsed.every(p => p.ok) && noDoubleClose;
    R('case13_safety_timeout_semantics', 'Safety-timeout semantics + duration parsing',
      ok ? 'PASS' : 'FAIL',
      { durationParsing: parsed,
        safetyTimeoutNeverDoubleCloses: noDoubleClose,
        closesAfterRealTransitionEnd: afterEnd.stats.actualCloses,
        closesAfterSafetyWindow: afterSafetyWindow.stats.actualCloses,
        classification: { implementationInvariantProven: [
            'duration is read from computed style, never hard-coded',
            'zero / sub-1ms duration closes immediately instead of awaiting an event that never fires',
            'transition-delay is included',
            'list-length mismatch and `all` are handled',
            'the safety timeout is a fallback only and is disarmed by a real completion'],
          browserBehaviourObserved: ['computed-style serialisation of transition shorthand'],
          assumptions: [], unverified: ['Firefox/Gecko'] } });
  }

  return out;
}

/* ------------------------------ adapters ------------------------------- */
async function chromiumAdapter() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await ctx.newPage();
  // emulateMedia lives on Page in this Playwright build, not BrowserContext.
  await page.goto(URL_);
  await page.waitForFunction(() => document.title === 'READY');
  return { tag: 'chromium', ua: await page.evaluate(() => navigator.userAgent),
    exec: js => page.evaluate(js), shot: () => page.screenshot(),
    setReducedMotion: async v => {
      await page.emulateMedia({ reducedMotion: v ? 'reduce' : 'no-preference' });
      await page.reload();
      await page.waitForFunction(() => document.title === 'READY');
    },
    clickAt: (x, y) => page.mouse.click(x, y),
    close: () => browser.close() };
}

const WD = 'http://127.0.0.1:4444';
async function webkitAdapter() {
  const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1280x900x24'], { stdio: 'ignore' });
  const proc = spawn('WebKitWebDriver', ['--port=4444'], { stdio: 'ignore', env: { ...process.env, DISPLAY: ':99' } });
  const rq = async (m, p, b) => {
    const r = await fetch(WD + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    const j = await r.json();
    if (j.value && j.value.error) throw new Error(`${j.value.error}: ${j.value.message}`);
    return j.value;
  };
  for (let i = 0; i < 60; i++) { try { await fetch(WD + '/status'); break; } catch { await sleep(200); } }
  const s = await rq('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'MiniBrowser',
    'webkitgtk:browserOptions': { binary: '/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser', args: ['--automation'] } } } });
  const S = p => `/session/${s.sessionId}${p}`;
  await rq('POST', S('/window/rect'), { width: 900, height: 600, x: 0, y: 0 });
  await rq('POST', S('/url'), { url: URL_ });
  for (let i = 0; i < 60; i++) { if (await rq('GET', S('/title')) === 'READY') break; await sleep(200); }
  return { tag: 'webkitgtk', ua: await rq('POST', S('/execute/sync'), { script: 'return navigator.userAgent', args: [] }),
    exec: js => rq('POST', S('/execute/sync'), { script: `return (${js})`, args: [] }),
    shot: async () => Buffer.from(await rq('GET', S('/screenshot')), 'base64'),
    setReducedMotion: null,      // WebDriver has no media emulation
    clickAt: async (x, y) => {
      await rq('POST', S('/actions'), { actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' },
        actions: [{ type: 'pointerMove', duration: 0, x, y }, { type: 'pointerDown', button: 0 },
                  { type: 'pause', duration: 40 }, { type: 'pointerUp', button: 0 }] }] });
    },
    close: async () => { try { await rq('DELETE', S('')); } catch {} proc.kill(); xvfb.kill(); } };
}

/* -------------------------------- main --------------------------------- */
const out = { generatedAt: new Date().toISOString(), purpose: 'P0 hardening pass — candidate DeferredOverlay primitive' };
try { Object.assign(out, JSON.parse(readFileSync(join(HERE, 'p0-hardening.json'), 'utf8'))); } catch {}

const ONLY = process.env.ENGINE;
const ENGINES = [
  ['chromium', chromiumAdapter, 'Chromium (Playwright build 1194, headless)'],
  ['webkitgtk', webkitAdapter, 'WebKitGTK 2.52.3 — WebKit evidence only, not Safari certification'],
].filter(([k]) => !ONLY || k === ONLY);

for (const [key, make, label] of ENGINES) {
  let drv;
  try { drv = await make(); out[key] = { engine: label, userAgent: drv.ua, cases: await cases(drv) }; }
  catch (e) { out[key] = { engine: label, error: String(e.stack || e) }; }
  finally { try { await drv?.close(); } catch {} }
}
out.firefox = { engine: 'Firefox / Gecko', status: 'UNVERIFIED — no Gecko runtime obtainable (see p0-report.md §3)' };

server.close();
writeFileSync(join(HERE, 'p0-hardening.json'), JSON.stringify(out, null, 2));

for (const k of ENGINES.map(e => e[0])) {
  const e = out[k];
  console.log('\n' + '='.repeat(78) + '\n' + e.engine);
  if (e.error) { console.log('  ERROR ' + e.error.split('\n')[0]); continue; }
  for (const [id, c] of Object.entries(e.cases)) {
    console.log(`  ${c.verdict.padEnd(11)} ${id.replace(/^case\d+_/, '').padEnd(34)} ${c.title}`);
  }
}
