/**
 * TEKAD deferred-close overlay primitive.
 *
 * A direct port of the primitive hardened in prototype P0
 * (`docs/research/prototypes/p0-overlay/`), which measured it across 13
 * production lifecycle cases in Chromium and WebKitGTK and proved its
 * re-entrancy invariant deterministically at 16/16.
 *
 * ── Why deferred close, and not the CSS `overlay` property ───────────────
 *
 * A closing top-layer element is demoted from the top layer on the first frame
 * of its exit animation unless the browser keeps it there. The CSS `overlay`
 * property exists to control that — but MDN is explicit that it "can only be
 * set by the browser; author styles cannot change it", so it was never a
 * foundation, only one optional entry in a transition list. It is also
 * unsupported in Firefox (all tracked versions) and Safari.
 *
 * P0 measured the consequence with a pixel oracle: in WebKit a closing element
 * keeps `display: block`, keeps its layout box, and stays positioned against
 * the viewport — while its pixels paint *beneath* a max-z-index cover from
 * ~300 ms. A computed-style or DOM-presence check reports success. Only the
 * rendered result reveals the failure.
 *
 * So the element is not closed while it animates. It stays open — hence in the
 * top layer — for the whole exit, and JS closes it once the animation ends.
 * This is a strict superset of the naive path's measured behaviour, which is
 * why P0 rejected a hybrid: native-where-supported would buy ~25 lines of JS in
 * Chromium at the cost of two permanently divergent exit paths and two
 * accessibility timing models.
 *
 * ── The contract boundary ────────────────────────────────────────────────
 *
 *   popover="manual"  TEKAD owns dismissal. The deferred visual exit lifecycle
 *                     is GUARANTEED.
 *   popover="auto"    The browser owns light-dismiss and removes the element
 *                     from the top layer BEFORE `toggle` is delivered — both
 *                     engines, identically. No window exists in which a
 *                     TEKAD-owned exit animation could run, so one is NOT
 *                     promised. The controller reconciles instead.
 *
 * ── Accessibility ────────────────────────────────────────────────────────
 *
 * ARIA and focus are released at close INTENT, not at animation end. Because
 * the element deliberately stays open while animating, releasing them later
 * would leave assistive-technology state lagging the visuals for the whole
 * duration.
 *
 * No generic `aria-hidden` rule is applied. P0 removed one from the candidate:
 * it is a no-op at best and an anti-pattern at worst. Role-appropriate
 * semantics — `aria-modal` and background `inert` for a modal dialog,
 * `aria-expanded`/`aria-controls` on the trigger for a popup — belong to the
 * concrete component, not to a rule invented by the primitive.
 *
 * **No assistive-technology behaviour is validated by this primitive or its
 * tests, and none is claimed.**
 */

/** Lifecycle state. `closing` means "animating out, still open and in the top layer". */
export type TekadOverlayState = 'closed' | 'open' | 'closing';

/** Which platform top-layer mechanism the host element uses. */
export type TekadOverlayKind = 'popover' | 'dialog';

/**
 * A diagnostic observation.
 *
 * P0's candidate accumulated a large `stats` object and two event arrays in the
 * instance. That was harness scaffolding: useful for a prototype, but it means
 * a production overlay allocates and grows arrays forever for observations
 * nobody reads. The sink replaces it — tests attach one, production attaches
 * nothing and pays nothing.
 */
export interface TekadOverlayDiagnostic {
  readonly event: string;
  readonly state: TekadOverlayState;
  readonly detail?: Readonly<Record<string, unknown>>;
}

export interface TekadDeferredOverlayOptions {
  /** The element carrying `aria-expanded`, if the component has one. */
  readonly trigger?: HTMLElement | null;
  /** Defaults to `popover`. */
  readonly kind?: TekadOverlayKind;
  /**
   * The platform close operation.
   *
   * Injectable for two reasons. It collapses the popover/dialog branch into one
   * call site — and it is the seam at which P0 proved the re-entrancy
   * invariant. Both engines deliver `toggle` asynchronously, so no browser run
   * can exercise a synchronous re-entry; simulating it here, at the smallest
   * appropriate boundary, is what makes the proof possible without asking a
   * real browser to behave in a way it does not.
   */
  readonly closeOp?: (() => void) | null;
  /** The transition property whose completion defines the exit. Defaults to `scale`. */
  readonly exitProperty?: string;
  /** Margin added to the measured duration before the safety timeout fires. */
  readonly safetyMarginMs?: number;
  /** Attach to observe lifecycle events. Omit in production. */
  readonly diagnostics?: ((d: TekadOverlayDiagnostic) => void) | null;
}

export const TEKAD_DEFAULT_EXIT_PROPERTY = 'scale';
export const TEKAD_DEFAULT_SAFETY_MARGIN_MS = 50;

export class TekadDeferredOverlay {
  readonly #el: HTMLElement;
  readonly #trigger: HTMLElement | null;
  readonly #kind: TekadOverlayKind;
  readonly #exitProperty: string;
  readonly #safetyMarginMs: number;
  readonly #closeOp: () => void;
  readonly #diagnostics: ((d: TekadOverlayDiagnostic) => void) | null;

  #state: TekadOverlayState = 'closed';
  #destroyed = false;
  /** Monotonic. Invalidates completions belonging to a superseded close. */
  #token = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #onEnd: ((e: TransitionEvent) => void) | null = null;
  #lastFocus: Element | null = null;
  /** Re-entrancy guard for the terminal transition. */
  #resetting = false;
  #depth = 0;

  readonly #onToggle: (e: Event) => void;

  constructor(el: HTMLElement, options: TekadDeferredOverlayOptions = {}) {
    this.#el = el;
    this.#trigger = options.trigger ?? null;
    this.#kind = options.kind ?? 'popover';
    this.#exitProperty = options.exitProperty ?? TEKAD_DEFAULT_EXIT_PROPERTY;
    this.#safetyMarginMs = options.safetyMarginMs ?? TEKAD_DEFAULT_SAFETY_MARGIN_MS;
    this.#diagnostics = options.diagnostics ?? null;
    this.#closeOp =
      options.closeOp ??
      (() => {
        if (this.#kind === 'dialog') (el as HTMLDialogElement).close();
        else el.hidePopover();
      });

    this.#onToggle = (e: Event) => {
      if (this.#destroyed) return;
      const toggle = e as ToggleEvent;

      // What a nested handler observes during the terminal transition. If the
      // ordering invariant holds, this is always 'closed'.
      if (this.#depth > 0) {
        this.#emit('reentrant-observation', {
          observedState: this.#state,
          duringResetDepth: this.#depth,
          resettingGuardHeld: this.#resetting,
        });
      }

      if (toggle.newState === 'closed' && this.#state !== 'closed') {
        this.#emit('browser-dismissed', {
          entryPoint: `${e.type} (newState=closed)`,
          stateAtEntry: this.#state,
          exitAnimationInFlight: this.#onEnd !== null || this.#timer !== null,
          handledBy: 'terminal transition — reconcile, do not animate',
        });
        this.#terminal();
      }
    };

    el.addEventListener('toggle', this.#onToggle);
    if (this.#kind === 'dialog') el.addEventListener('close', this.#onToggle);
  }

  get state(): TekadOverlayState {
    return this.#state;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /**
   * The exit duration, read from computed style for the named property.
   *
   * Never hard-coded, because a consumer restyles the transition and a
   * hard-coded duration then either truncates the animation or leaves the
   * element open after it finishes. Handles `all`, delays, second units,
   * multi-property lists, and lists whose lengths disagree — CSS repeats the
   * shorter list, so the index wraps rather than falling off the end.
   */
  exitDurationMs(): number {
    const cs = getComputedStyle(this.#el);
    const props = String(cs.transitionProperty || '')
      .split(',')
      .map((s) => s.trim());
    const durations = String(cs.transitionDuration || '')
      .split(',')
      .map((s) => s.trim());
    const delays = String(cs.transitionDelay || '')
      .split(',')
      .map((s) => s.trim());

    const toMs = (v: string): number => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000);

    let i = props.indexOf(this.#exitProperty);
    if (i === -1) i = props.indexOf('all');
    if (i === -1) return 0;

    const d =
      toMs(durations[i % durations.length] ?? '0s') + toMs(delays[i % delays.length] ?? '0s');
    return Number.isFinite(d) ? d : 0;
  }

  open(): void {
    if (this.#destroyed) return;

    // Two independent defences, deliberately not one: the token invalidates any
    // completion still to arrive, and clearing cancels the work pre-emptively.
    // Either alone would be enough in the cases tested; both together mean a
    // gap in one is not a gap in the system.
    this.#token++;
    this.#clearPending();

    this.#el.classList.remove('closing');
    this.#state = 'open';
    this.#lastFocus = typeof document !== 'undefined' ? document.activeElement : null;
    this.#trigger?.setAttribute('aria-expanded', 'true');

    if (this.#kind === 'dialog') {
      const dialog = this.#el as HTMLDialogElement;
      if (!dialog.open) dialog.showModal();
    } else if (!this.#el.matches(':popover-open')) {
      this.#el.showPopover();
    }
    this.#emit('opened');
  }

  /**
   * CLOSE INTENT.
   *
   * ARIA and focus are released here — at intent — because the element stays
   * open and visible for the whole exit animation. Releasing them at animation
   * end would leave assistive technology describing an overlay the user has
   * already dismissed.
   */
  close(): void {
    if (this.#destroyed || this.#state === 'closed') return;

    const token = ++this.#token;
    this.#clearPending();
    this.#state = 'closing';

    this.#trigger?.setAttribute('aria-expanded', 'false');
    if (this.#lastFocus instanceof HTMLElement) this.#lastFocus.focus();
    this.#emit('close-intent', { accessibilityReleased: true });

    this.#el.classList.add('closing');

    const duration = this.exitDurationMs();

    // A ~zero duration fires no transitionend at all — under
    // prefers-reduced-motion, or a consumer stylesheet with no transition, the
    // overlay would otherwise stay open forever waiting for an event that never
    // comes. Closing immediately is not an optimisation; it is the difference
    // between working and hanging.
    if (duration <= 1) {
      this.#emit('zero-duration-immediate');
      this.#finish(token);
      return;
    }

    this.#onEnd = (e: TransitionEvent) => {
      // Filtered by target AND propertyName: a transition on a descendant
      // bubbles to this element, and a multi-property transition fires once per
      // property. Either would close the overlay early.
      if (e.target !== this.#el) return;
      if (e.propertyName !== this.#exitProperty) {
        this.#emit('decoy-ignored', { propertyName: e.propertyName });
        return;
      }
      this.#emit(e.type === 'transitioncancel' ? 'transition-cancelled' : 'transition-ended');
      this.#finish(token);
    };
    this.#el.addEventListener('transitionend', this.#onEnd as EventListener);
    this.#el.addEventListener('transitioncancel', this.#onEnd as EventListener);

    // A FALLBACK ONLY. Armed always, because a transition can be interrupted in
    // ways that fire neither event; disarmed by a real completion so it can
    // never cause a second close.
    this.#timer = setTimeout(() => {
      this.#emit('safety-timeout');
      this.#finish(token);
    }, duration + this.#safetyMarginMs);
  }

  /** The actual DOM and top-layer close. Guarded against stale completions. */
  #finish(token: number): void {
    if (this.#destroyed) return this.#emit('suppressed', { reason: 'destroyed' });
    if (token !== this.#token) return this.#emit('suppressed', { reason: 'stale token' });
    if (this.#state !== 'closing') return this.#emit('suppressed', { reason: 'not closing' });
    this.#clearPending();
    this.#terminal();
    this.#emit('closed');
  }

  /**
   * The terminal transition.
   *
   * ORDERING IS LOAD-BEARING. The close operation may deliver `toggle` or
   * `close` synchronously, re-entering this method through `#onToggle`. The
   * terminal state is therefore established BEFORE the close call, so a nested
   * handler observes `state === 'closed'` and returns immediately.
   *
   * P0 found this as a latent defect: the candidate originally set the state
   * *after* `hidePopover()`, leaving a window in which `#onToggle`'s guard was
   * ineffective. Neither engine delivers `toggle` synchronously, so no browser
   * run exposed it — it was proved and fixed at the `closeOp` seam instead, and
   * the fix is defence-in-depth rather than a response to observed breakage.
   * `#resetting` is the second, independent guard.
   */
  #terminal(): void {
    if (this.#resetting) {
      this.#emit('reentrant-reset-blocked');
      return;
    }
    this.#resetting = true;
    this.#depth++;
    try {
      this.#clearPending();
      this.#el.classList.remove('closing');
      this.#state = 'closed'; // BEFORE the close call. Do not reorder.
      try {
        this.#closeOp();
      } catch {
        // Already closed by the browser. Reconciling, not fighting.
      }
    } finally {
      this.#depth--;
      this.#resetting = false;
    }
  }

  #clearPending(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (this.#onEnd) {
      this.#el.removeEventListener('transitionend', this.#onEnd as EventListener);
      this.#el.removeEventListener('transitioncancel', this.#onEnd as EventListener);
      this.#onEnd = null;
    }
  }

  /**
   * Cancels every timer and listener this controller owns.
   *
   * The element is deliberately NOT closed — unmounting is the caller's
   * concern. Only controller-owned decoration is withdrawn.
   *
   * Removing the `closing` class and resetting the state is a P0 second-order
   * review fix: without it, destroying mid-animation left visual exit state on
   * a DOM node that outlives the controller, and `state` stuck at `closing`.
   */
  destroy(): void {
    this.#destroyed = true;
    this.#token++;
    this.#clearPending();
    this.#el.classList.remove('closing');
    this.#state = 'closed';
    this.#el.removeEventListener('toggle', this.#onToggle);
    this.#el.removeEventListener('close', this.#onToggle);
    this.#emit('destroyed');
  }

  #emit(event: string, detail?: Record<string, unknown>): void {
    this.#diagnostics?.({
      event,
      state: this.#state,
      ...(detail ? { detail } : {}),
    });
  }
}
