# ADR-010 — Overlay architecture

**Status:** Accepted · **Date:** 2026-08-27 (was Proposed 2026-08-26)
**Evidence:** `docs/research/23-overlay-strategy.md`

## Context
Dialog, drawer, menu, select, combobox, tooltip, popover, datepicker and
command palette all need one foundation. `@angular/aria` provides none of it
(ADR-005), so TEKAD must own the floating layer.

## Decision
A **TEKAD-owned hybrid** on the platform substrate:

- **Top layer:** `popover` (91.5%) for non-modal surfaces;
  **`<dialog>.showModal()`** (96.1%) for modal dialog and drawer, which grants
  `inert`, `aria-modal`, Escape and focus restore for free. Feature-detect,
  with a `position: fixed` + `@layer` z-index fallback.
- **Dismissal:** `popover="auto"` where native stack semantics are wanted;
  `"manual"` plus TEKAD's dispatcher for nested portalled submenus and
  tooltips. **Never `popover="hint"`** — Safari has zero support.
- **Inertness:** `inert` (94.7%). `aria-modal` is the annotation; `inert` is
  the enforcement. Never the reverse, and never the `aria-hidden` sibling walk.
- **Positioning:** Floating UI (`@floating-ui/dom`, MIT, **6.4 KB gzip**) as
  the baseline; CSS anchor positioning behind `@supports (anchor-name: --x)`
  for tooltip and popover only.
- **Public placement API is logical** (`block-start`, `inline-end`).
- **Budget: under 10 KB gzip** for foundation + positioning.

## Alternatives
`@angular/cdk/overlay` — rejected. Measured at **24.3 KB gzip that does not
tree-shake** (the minimal factory import is 98% of the full barrel), it
dictates DOM/CSS/`@layer` structure, and its focus trap is pre-`inert`
sentinel-based. Notably it already uses the Popover API by default
(`usePopover ?? true`), which validates the substrate choice.
Platform-only — rejected: anchor positioning is 84.1%, has no JS-observable
output and no `size` equivalent, both mandatory for select and combobox.
Floating UI alone — rejected: solves geometry and nothing else.

## Consequences
TEKAD owns focus trapping, dismissal, stacking and scroll strategies. Two
sequencing constraints are permanent: `showModal()` force-closes `auto`
popovers, and `showPopover()` throws `InvalidStateError` if called
re-entrantly from `beforetoggle`.

**⚠️ Gated on prototype P0.** The CSS `overlay` property is unsupported in
Firefox and Safari (73.5% global), so a closing overlay is demoted from the
top layer on the first frame of its exit transition. Resolve the exit-animation
approach before implementing any overlay component.

---

## 2026-08-27 — P0 prototype result: **CONDITIONAL GO**

Evidence: `docs/research/prototypes/p0-overlay/` (report, harness, runner, raw
results, screenshots). This ADR now rests on measured data, not on the
research-phase hypothesis.

**Measured.** Chromium (build 1194) passes every scenario with *both* exit
strategies. WebKitGTK 2.52.3 — **WebKit evidence, not Safari certification** —
fails the naive strategy 0/9 across the ancestor sweep and passes the deferred
strategy 9/9. Firefox/Gecko is **UNVERIFIED**: no Gecko runtime is obtainable
in this environment (all Mozilla hosts and the Playwright CDN are blocked by
the egress allowlist; Ubuntu's `firefox` is a snap stub). **No Firefox
behaviour is inferred from WebKit.**

**Mechanism, from the raw trace.** In WebKit the closing element keeps
`display: block`, keeps its layout box and stays positioned against the
viewport — but from ~300 ms its pixels paint *beneath* a max-z-index cover.
Top-layer paint priority is lost while layout survives. A computed-style or
DOM-presence check would have reported success; only a pixel oracle caught it.

**Decision refined.** The exit strategy is **deferred close as the single code
path** — the element stays open (hence in the top layer) for the whole
animation, and JS closes it only once the animation ends. This supersedes the
"go/no-go on the CSS `overlay` property" framing above.

`overlay` is **not** author-settable — MDN: it "can only be set by the browser;
author styles cannot change it." It was therefore never a foundation, only one
optional entry in a transition list. The foundation is the top layer
(`popover` / `<dialog>.showModal()` / `inert`), which held in both engines
tested across all nine ancestor configurations, at the viewport edge, and when
nested.

A hybrid (native where supported, deferred elsewhere) is **rejected**: deferred
is a strict superset of the naive path's measured behaviour, so a hybrid buys
~25 lines of JS in Chromium at the cost of two permanently divergent exit code
paths and two accessibility timing models. Under deferred, adding `overlay` to
the transition list is dead code — the element is never closed while animating.

**Verified support data** (independently re-checked, not carried over):
caniuse `mdn-css_properties_overlay` — Chrome/Edge 117+, Opera 103+, Samsung
24+; **Firefox not supported across all tracked versions 2–157**; **Safari not
supported 3.1–27**, iOS Safari not supported 3.2–26.6; global 73.51%. MDN
marks it *Limited availability, not Baseline*.

**Conditions on the GO.**
1. Gecko runtime behaviour remains unverified. Because the chosen strategy does
   not depend on `overlay` at all, this does **not** block locking the
   architecture — it *would* have blocked the native-only or hybrid options.
2. Real Safari likewise unverified by runtime test.
3. What still needs verification in Gecko and real Safari is the
   `popover`/`<dialog>`/`inert` **substrate**, not `overlay`.

**Accessibility consequence to carry into implementation.** Because the element
stays open during the exit animation, focus return, `inert` release and
`aria-expanded` must fire on *close intent*, not on animation end — otherwise
assistive-technology state lags the visuals.

**Methodology note for future re-runs.** Three of the five failures observed
during this prototype were harness/oracle defects, not browser behaviour:
`elementFromPoint` does not return a closing popover; sample labels were
intended sleeps rather than true elapsed time; and the geometry oracle demanded
a flush edge while the exit animation legitimately scaled the box inward. Any
re-run must retain the pixel oracle, the page-side clock and the scale-tolerant
geometry check. See §5 of the report.

## 2026-08-27 — hardening pass: **P0 CLOSED**

Thirteen production lifecycle cases run against a candidate `DeferredOverlay`
primitive. Evidence: `docs/research/prototypes/p0-overlay/`.

**Results, per engine — not as an aggregate score:**

- **Chromium** — cases 1–13 **PASS**.
- **WebKitGTK 2.52.3** (*WebKit evidence only; does not certify Safari*) —
  cases 1–7 **PASS**; case 8 (`prefers-reduced-motion`) **UNVERIFIED** because
  W3C WebDriver has no media-feature emulation; cases 9–13 **PASS**.
- **Firefox / Gecko** — **UNVERIFIED**. No Gecko runtime is obtainable in this
  environment; not one case was executed. No Gecko behaviour is inferred from
  WebKit anywhere.

> Implementation hardening passes in Chromium and WebKitGTK for all executable
> cases, with WebKit reduced-motion remaining UNVERIFIED due to driver
> capability. Firefox/Gecko remains UNVERIFIED.

**Status: CONDITIONAL GO — architecture locked; candidate lifecycle contract
hardened; cross-engine and assistive-technology validation remains tracked
separately.**

### The `popover` mode contract

| Mode | Ownership | Guarantee |
|---|---|---|
| `popover="manual"` | TEKAD owns dismissal | **Deferred visual exit lifecycle is guaranteed.** |
| `popover="auto"` | Browser owns light-dismiss | TEKAD reconciles the already-closed state. **A deferred exit animation is NOT promised.** |

Verified identically in both engines: a genuine pointer light-dismiss removes
the element from the top layer **before** the `toggle` event reaches the
controller, so no window exists in which a TEKAD-owned exit animation could
run. Case 9 (**PASS**) proves *reconciliation without leaks* — it is **not**
evidence that `popover="auto"` supports a deferred exit animation, which is
recorded separately as **NOT APPLICABLE**.

### Contract requirements

Twelve normative requirements in `p0-report.md` §H5, each tied to a
reproducible case. The load-bearing ones: accessibility released at close
*intent*, not animation end; exit duration read from computed style for the
named property (handling `all`, delays, second units, multi-property lists and
list-length mismatches) and never hard-coded; ~zero duration closes immediately
rather than awaiting a `transitionend` that never fires; a safety timeout that
is a **fallback only**, disarmed by a real completion so it can never cause a
second close; `transitionend`/`transitioncancel` filtered by `propertyName`
**and** `target`; a monotonic token plus pre-emptive cancellation as two
independent defences; `destroy()` leaves nothing pending; and browser-driven
dismissal reconciled via `toggle` with the terminal state entered **before**
the DOM close call.

### Latent hazard found and fixed

`_hardReset()` originally set `state = 'closed'` *after* `hidePopover()`, so a
synchronously-dispatched `toggle` could have re-entered cleanup. Fixed by
entering the terminal state first, plus an explicit re-entrancy guard.
**Root cause:** the terminal state was not established before control could
leave the method, so `_onToggle`'s `state !== 'closed'` guard was ineffective
during that window.

Both engines delivered `toggle` **asynchronously**, so the browser runs do not
prove the invariant. It is proven separately and deterministically by
`reentrancy.test.mjs` (**16/16**), which simulates synchronous delivery at the
injectable `closeOp` seam — evidence class **DEFENSIVE / SIMULATED**, never
reported as observed browser behaviour. A control assertion confirms the
pre-fix ordering genuinely re-enters, so the proof is not vacuous.

**Second-order review** of `_onToggle`/`_hardReset`/`_finish`/`_clearPending`/
`open`/`close` found **one further concrete defect**: `destroy()` left the
`closing` class on the element and `state` at `'closing'`, leaking visual exit
state onto a DOM node that outlives the controller. Fixed; three assertions
added. No redesign was made.

### Accessibility

Four distinct layers, only the first three observed: **close intent** (ARIA and
focus state released) → **visual exit** (animating while still open and in the
top layer) → **actual close** (DOM/top-layer removal) → **assistive-technology
behaviour, UNVERIFIED**. No screen reader was tested at any point in P0, and no
screen-reader correctness is claimed.

A generic `aria-hidden` rule was **removed** from the candidate: it is a no-op
at best and an anti-pattern at worst, and was not load-bearing for any test.
Role-appropriate WAI-ARIA semantics belong to the concrete component (modal
dialog: `aria-modal` + `inert` on the background; listbox/menu popup:
`aria-expanded`/`aria-controls` on the trigger per the APG), not to a rule
invented by the primitive.

### Tracked separately, not assumed

Firefox/Gecko (whole matrix) · real Safari, macOS and iOS · screen readers ·
`prefers-reduced-motion` in WebKit · synchronous `toggle` delivery · mobile
virtual keyboard · `showModal()` force-closing `auto` popovers.
